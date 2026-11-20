using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Models.Auth;
using FamilyEventPlanner.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace FamilyEventPlanner.Api.Tests;

public sealed class ExternalAccountDeletionTests
{
    [Fact]
    public async Task RequestResponseDoesNotLookUpAccountAndOnlyExistingAccountsReceiveEmail()
    {
        await using var context = CreateContext();
        var user = CreateUser("person@example.com");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var emailSender = new TestEmailSender();
        var emailQueue = new TestEmailQueue();
        var service = CreateService(context, emailSender, emailQueue: emailQueue);
        var controller = new ExternalAccountDeletionController(service);

        var existingResponse = Assert.IsType<AcceptedResult>(await controller.Request(
            new ExternalAccountDeletionRequest { Email = "person@example.com" },
            CancellationToken.None));
        var unknownResponse = Assert.IsType<AcceptedResult>(await controller.Request(
            new ExternalAccountDeletionRequest { Email = "unknown@example.com" },
            CancellationToken.None));

        Assert.Equal(GetMessage(existingResponse.Value), GetMessage(unknownResponse.Value));
        Assert.Equal(2, emailQueue.Messages.Count);
        Assert.Empty(await context.AccountDeletionVerificationTokens.ToListAsync());
        Assert.Empty(emailSender.Messages);

        await service.ProcessQueuedRequestAsync(emailQueue.Messages[0].Email, CancellationToken.None);
        await service.ProcessQueuedRequestAsync(emailQueue.Messages[1].Email, CancellationToken.None);

        Assert.Single(emailSender.Messages);
        var record = await context.AccountDeletionVerificationTokens.SingleAsync();
        var token = ExtractToken(emailSender.Messages[0].Body);
        Assert.Equal(HashToken(token), record.TokenHash);
        Assert.NotEqual(token, record.TokenHash);
        Assert.Equal(user.Id, record.UserId);
        Assert.True(record.ExpiresAtUtc > record.CreatedAtUtc);
        Assert.NotNull(record.EmailSentAtUtc);
    }

    [Fact]
    public async Task DuplicateQueuedRequestsSendOnlyOneEmailForActiveToken()
    {
        await using var context = CreateContext();
        context.Users.Add(CreateUser("person@example.com"));
        await context.SaveChangesAsync();
        var emailSender = new TestEmailSender();
        var emailQueue = new TestEmailQueue();
        var service = CreateService(context, emailSender, emailQueue: emailQueue);

        await service.RequestAsync("person@example.com", CancellationToken.None);
        await service.RequestAsync("person@example.com", CancellationToken.None);
        foreach (var request in emailQueue.Messages)
            await service.ProcessQueuedRequestAsync(request.Email, CancellationToken.None);

        Assert.Single(emailSender.Messages);
        Assert.Single(await context.AccountDeletionVerificationTokens.ToListAsync());
    }

    [Fact]
    public async Task UndeliveredTokenIsReplacedAndRetrySendsANewEmail()
    {
        await using var context = CreateContext();
        context.Users.Add(CreateUser("person@example.com"));
        await context.SaveChangesAsync();
        var emailSender = new TestEmailSender { ShouldFail = true };
        var emailQueue = new TestEmailQueue();
        var service = CreateService(context, emailSender, emailQueue: emailQueue);

        Assert.Equal(
            ExternalAccountDeletionRequestResult.Accepted,
            await service.RequestAsync("person@example.com", CancellationToken.None));
        await service.ProcessQueuedRequestAsync(emailQueue.Messages[0].Email, CancellationToken.None);
        var failedToken = await context.AccountDeletionVerificationTokens.SingleAsync();
        Assert.NotNull(failedToken.UsedAtUtc);
        Assert.Null(failedToken.EmailSentAtUtc);

        emailSender.ShouldFail = false;
        await service.RequestAsync("person@example.com", CancellationToken.None);
        await service.ProcessQueuedRequestAsync(emailQueue.Messages[1].Email, CancellationToken.None);

        Assert.Equal(2, await context.AccountDeletionVerificationTokens.CountAsync());
        Assert.Equal(2, emailSender.AttemptCount);
        Assert.NotNull((await context.AccountDeletionVerificationTokens
            .OrderByDescending(item => item.CreatedAtUtc)
            .FirstAsync()).EmailSentAtUtc);
    }

    [Fact]
    public async Task ValidTokenDeletesAccountThroughSharedServiceAndCannotBeReplayed()
    {
        await using var context = CreateContext();
        var user = CreateUser("person@example.com");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var emailSender = new TestEmailSender();
        var emailQueue = new TestEmailQueue();
        var service = CreateService(context, emailSender, emailQueue: emailQueue);
        await service.RequestAsync(user.Email, CancellationToken.None);
        await service.ProcessQueuedRequestAsync(emailQueue.Messages.Single().Email, CancellationToken.None);
        var token = ExtractToken(emailSender.Messages.Single().Body);

        var firstResult = await service.VerifyAsync(token, CancellationToken.None);
        var replayResult = await service.VerifyAsync(token, CancellationToken.None);

        Assert.Equal(ExternalAccountDeletionVerificationResult.Deleted, firstResult);
        Assert.Equal(ExternalAccountDeletionVerificationResult.InvalidOrExpired, replayResult);
        Assert.False(await context.Users.AnyAsync(candidate => candidate.Id == user.Id));
        Assert.Single(await context.AccountDeletionAudits.ToListAsync());
    }

    [Fact]
    public async Task ConcurrentVerificationAttemptsCanStartDeletionOnlyOnce()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var user = CreateUser("person@example.com");
        var rawToken = new string('C', 64);
        await using (var seedContext = new AppDbContext(options))
        {
            seedContext.Users.Add(user);
            seedContext.AccountDeletionVerificationTokens.Add(new AccountDeletionVerificationToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TokenHash = HashToken(rawToken),
                CreatedAtUtc = DateTime.UtcNow,
                ExpiresAtUtc = DateTime.UtcNow.AddMinutes(30)
            });
            await seedContext.SaveChangesAsync();
        }

        var deletionService = new CountingAccountDeletionService();
        await using var firstContext = new AppDbContext(options);
        await using var secondContext = new AppDbContext(options);
        var firstService = CreateService(firstContext, new TestEmailSender(), deletionService);
        var secondService = CreateService(secondContext, new TestEmailSender(), deletionService);

        var results = await Task.WhenAll(
            firstService.VerifyAsync(rawToken, CancellationToken.None),
            secondService.VerifyAsync(rawToken, CancellationToken.None));

        Assert.Single(results.Where(result => result == ExternalAccountDeletionVerificationResult.Deleted));
        Assert.Single(results.Where(result => result == ExternalAccountDeletionVerificationResult.InvalidOrExpired));
        Assert.Equal(1, deletionService.DeleteCallCount);
    }

    [Fact]
    public async Task ExpiredTokenIsRejectedWithoutDeletingAccount()
    {
        await using var context = CreateContext();
        var user = CreateUser("person@example.com");
        var rawToken = new string('B', 64);
        context.Users.Add(user);
        context.AccountDeletionVerificationTokens.Add(new AccountDeletionVerificationToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = HashToken(rawToken),
            CreatedAtUtc = DateTime.UtcNow.AddHours(-2),
            ExpiresAtUtc = DateTime.UtcNow.AddHours(-1)
        });
        await context.SaveChangesAsync();
        var service = CreateService(context, new TestEmailSender());

        var result = await service.VerifyAsync(rawToken, CancellationToken.None);

        Assert.Equal(ExternalAccountDeletionVerificationResult.InvalidOrExpired, result);
        Assert.True(await context.Users.AnyAsync(candidate => candidate.Id == user.Id));
    }

    [Fact]
    public async Task InvalidTokenIsRejectedWithoutDeletingAccount()
    {
        await using var context = CreateContext();
        var user = CreateUser("person@example.com");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var service = CreateService(context, new TestEmailSender());

        var result = await service.VerifyAsync(new string('A', 64), CancellationToken.None);

        Assert.Equal(ExternalAccountDeletionVerificationResult.InvalidOrExpired, result);
        Assert.True(await context.Users.AnyAsync(candidate => candidate.Id == user.Id));
    }

    [Fact]
    public async Task LastAdministratorRejectionDoesNotReportDeletionOrRemoveAccount()
    {
        await using var context = CreateContext();
        var user = CreateUser("admin@example.com");
        var group = new FamilyGroup { Id = Guid.NewGuid(), Name = "Community", CreatedAt = DateTime.UtcNow };
        context.Users.Add(user);
        context.FamilyGroups.Add(group);
        context.GroupMembers.Add(new GroupMember
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            FamilyGroupId = group.Id,
            IsAdmin = true,
            JoinedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();
        var emailSender = new TestEmailSender();
        var emailQueue = new TestEmailQueue();
        var service = CreateService(context, emailSender, emailQueue: emailQueue);
        await service.RequestAsync(user.Email, CancellationToken.None);
        await service.ProcessQueuedRequestAsync(emailQueue.Messages.Single().Email, CancellationToken.None);

        var result = await service.VerifyAsync(
            ExtractToken(emailSender.Messages.Single().Body),
            CancellationToken.None);

        Assert.Equal(ExternalAccountDeletionVerificationResult.UnableToComplete, result);
        Assert.True(await context.Users.AnyAsync(candidate => candidate.Id == user.Id));
    }

    [Fact]
    public async Task EmailDispatcherInvalidatesTokenWhenProviderDeliveryFails()
    {
        var databaseName = Guid.NewGuid().ToString();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;
        await using (var seedContext = new AppDbContext(options))
        {
            seedContext.Users.Add(CreateUser("person@example.com"));
            await seedContext.SaveChangesAsync();
        }

        var emailSender = new TestEmailSender { ShouldFail = true };
        var queue = new ExternalAccountDeletionEmailQueue();
        var services = new ServiceCollection()
            .AddLogging()
            .AddDbContext<AppDbContext>(builder => builder.UseInMemoryDatabase(databaseName))
            .AddScoped<IAccountDeletionService, AccountDeletionService>()
            .AddSingleton<ExternalAccountDeletionEmailQueue>(queue)
            .AddSingleton<IExternalAccountDeletionEmailQueue>(queue)
            .AddScoped<IExternalAccountDeletionService, ExternalAccountDeletionService>()
            .AddSingleton<IEmailSender>(emailSender)
            .AddSingleton<IConfiguration>(CreateConfiguration())
            .BuildServiceProvider();
        Assert.True(queue.TryQueue(new ExternalAccountDeletionEmailRequest("person@example.com")));
        var dispatcher = new ExternalAccountDeletionEmailDispatcher(
            queue,
            services.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<ExternalAccountDeletionEmailDispatcher>.Instance);

        await dispatcher.StartAsync(CancellationToken.None);
        await emailSender.EmailAttempted.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await dispatcher.StopAsync(CancellationToken.None);

        await using var verifyContext = new AppDbContext(options);
        var verificationToken = await verifyContext.AccountDeletionVerificationTokens.SingleAsync();
        Assert.NotNull(verificationToken.UsedAtUtc);
        Assert.Null(verificationToken.EmailSentAtUtc);
    }

    [Fact]
    public async Task DeletionFailureIsNotReportedAsSuccessful()
    {
        await using var context = CreateContext();
        var user = CreateUser("person@example.com");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var emailSender = new TestEmailSender();
        var emailQueue = new TestEmailQueue();
        var service = CreateService(
            context,
            emailSender,
            new ThrowingAccountDeletionService(),
            emailQueue);
        await service.RequestAsync(user.Email, CancellationToken.None);
        await service.ProcessQueuedRequestAsync(emailQueue.Messages.Single().Email, CancellationToken.None);

        var result = await service.VerifyAsync(
            ExtractToken(emailSender.Messages.Single().Body),
            CancellationToken.None);

        Assert.Equal(ExternalAccountDeletionVerificationResult.ProcessingFailed, result);
        Assert.True(await context.Users.AnyAsync(candidate => candidate.Id == user.Id));
        Assert.True((await context.AccountDeletionVerificationTokens.SingleAsync()).UsedAtUtc.HasValue);
    }

    [Fact]
    public async Task ExpiredVerificationTokensAreRemovedByTheExistingCleanupProcessor()
    {
        await using var context = CreateContext();
        var user = CreateUser("person@example.com");
        context.Users.Add(user);
        context.AccountDeletionVerificationTokens.Add(new AccountDeletionVerificationToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = HashToken("expired-token"),
            CreatedAtUtc = DateTime.UtcNow.AddHours(-2),
            ExpiresAtUtc = DateTime.UtcNow.AddHours(-1)
        });
        await context.SaveChangesAsync();

        await new ContentExpirationProcessor(context)
            .ProcessAsync(DateTime.UtcNow);

        Assert.Empty(await context.AccountDeletionVerificationTokens.ToListAsync());
    }

    [Fact]
    public async Task VerificationControllerReportsSuccessOnlyAfterDeletion()
    {
        await using var context = CreateContext();
        var user = CreateUser("person@example.com");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var emailSender = new TestEmailSender();
        var emailQueue = new TestEmailQueue();
        var service = CreateService(context, emailSender, emailQueue: emailQueue);
        await service.RequestAsync(user.Email, CancellationToken.None);
        await service.ProcessQueuedRequestAsync(emailQueue.Messages.Single().Email, CancellationToken.None);
        var controller = new ExternalAccountDeletionController(service);

        var response = await controller.Verify(
            new VerifyExternalAccountDeletionRequest
            {
                Token = ExtractToken(emailSender.Messages.Single().Body)
            },
            CancellationToken.None);

        Assert.IsType<OkObjectResult>(response);
    }

    [Fact]
    public void PublicEndpointsAreAnonymousAndRateLimited()
    {
        Assert.NotNull(typeof(ExternalAccountDeletionController)
            .GetCustomAttributes(typeof(AllowAnonymousAttribute), true).SingleOrDefault());
        var requestRateLimit = typeof(ExternalAccountDeletionController)
            .GetMethod(nameof(ExternalAccountDeletionController.Request))!
            .GetCustomAttributes(typeof(EnableRateLimitingAttribute), true)
            .Cast<EnableRateLimitingAttribute>()
            .Single();
        var verifyRateLimit = typeof(ExternalAccountDeletionController)
            .GetMethod(nameof(ExternalAccountDeletionController.Verify))!
            .GetCustomAttributes(typeof(EnableRateLimitingAttribute), true)
            .Cast<EnableRateLimitingAttribute>()
            .Single();

        Assert.Equal("password-recovery", requestRateLimit.PolicyName);
        Assert.Equal("password-recovery", verifyRateLimit.PolicyName);
    }

    [Fact]
    public void PublicPageExplainsVerificationAndDataHandling()
    {
        var pagePath = Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "../../../../FamilyEventPlanner.Api/wwwroot/delete-account/index.html"));
        var page = File.ReadAllText(pagePath);

        Assert.Contains("request-form", page);
        Assert.Contains("verify-button", page);
        Assert.Contains("Shared text and captions", page);
        Assert.Contains("Photo files, backups", page);
    }

    [Fact]
    public void VerificationTokenConsumptionUsesConcurrencyControl()
    {
        using var context = CreateContext();
        var entity = context.Model.FindEntityType(typeof(AccountDeletionVerificationToken))!;
        var usedAt = entity.FindProperty(nameof(AccountDeletionVerificationToken.UsedAtUtc))!;
        var activeUserIndex = entity.GetIndexes().Single(index =>
            index.Properties.Any(property => property.Name == nameof(AccountDeletionVerificationToken.UserId)));

        Assert.True(usedAt.IsConcurrencyToken);
        Assert.True(activeUserIndex.IsUnique);
        Assert.Equal("[UsedAtUtc] IS NULL", activeUserIndex.GetFilter());
    }

    private static ExternalAccountDeletionService CreateService(
        AppDbContext context,
        TestEmailSender emailSender,
        IAccountDeletionService? accountDeletionService = null,
        TestEmailQueue? emailQueue = null) =>
        new(
            context,
            accountDeletionService ?? new AccountDeletionService(context),
            emailSender,
            emailQueue ?? new TestEmailQueue(),
            CreateConfiguration(),
            NullLogger<ExternalAccountDeletionService>.Instance);

    private static IConfiguration CreateConfiguration() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AccountDeletion:VerificationUrl"] = "https://example.com/delete-account",
                ["AccountDeletion:VerificationTokenLifetimeMinutes"] = "30"
            })
            .Build();

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static User CreateUser(string email)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = email.Split('@')[0],
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, "current-password");
        return user;
    }

    private static string ExtractToken(string body) =>
        Regex.Match(body, @"#token=([A-F0-9]{64})").Groups[1].Value;

    private static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static string? GetMessage(object? response) =>
        response?.GetType().GetProperty("message")?.GetValue(response)?.ToString();

    private sealed class TestEmailSender : IEmailSender
    {
        public bool IsConfigured => true;
        public bool ShouldFail { get; set; }
        public int AttemptCount { get; private set; }
        public TaskCompletionSource EmailAttempted { get; } =
            new(TaskCreationOptions.RunContinuationsAsynchronously);
        public List<(string Recipient, string Body)> Messages { get; } = [];

        public Task SendAsync(string recipient, string subject, string body)
        {
            AttemptCount++;
            EmailAttempted.TrySetResult();
            if (ShouldFail)
                throw new InvalidOperationException("Delivery failed.");

            Messages.Add((recipient, body));
            return Task.CompletedTask;
        }
    }

    private sealed class TestEmailQueue : IExternalAccountDeletionEmailQueue
    {
        public List<ExternalAccountDeletionEmailRequest> Messages { get; } = [];

        public bool TryQueue(ExternalAccountDeletionEmailRequest request)
        {
            Messages.Add(request);
            return true;
        }
    }

    private sealed class CountingAccountDeletionService : IAccountDeletionService
    {
        private int _deleteCallCount;
        public int DeleteCallCount => _deleteCallCount;

        public Task<AccountDeletionResult> DeleteAsync(
            Guid userId,
            string password,
            CancellationToken cancellationToken) =>
            Task.FromResult(AccountDeletionResult.Deleted);

        public Task<AccountDeletionResult> DeleteVerifiedAsync(
            Guid userId,
            CancellationToken cancellationToken)
        {
            Interlocked.Increment(ref _deleteCallCount);
            return Task.FromResult(AccountDeletionResult.Deleted);
        }
    }

    private sealed class ThrowingAccountDeletionService : IAccountDeletionService
    {
        public Task<AccountDeletionResult> DeleteAsync(
            Guid userId,
            string password,
            CancellationToken cancellationToken) =>
            throw new InvalidOperationException("Deletion failed.");

        public Task<AccountDeletionResult> DeleteVerifiedAsync(
            Guid userId,
            CancellationToken cancellationToken) =>
            throw new InvalidOperationException("Deletion failed.");
    }
}
