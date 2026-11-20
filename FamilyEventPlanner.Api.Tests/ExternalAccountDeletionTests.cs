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
    public async Task RequestDoesNotRevealWhetherEmailExistsAndStoresOnlyTokenHash()
    {
        await using var context = CreateContext();
        var user = CreateUser("person@example.com");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var emailSender = new TestEmailSender();
        var service = CreateService(context, emailSender);
        var controller = new ExternalAccountDeletionController(service);

        var existingResponse = Assert.IsType<AcceptedResult>(await controller.Request(
            new ExternalAccountDeletionRequest { Email = "person@example.com" },
            CancellationToken.None));
        var unknownResponse = Assert.IsType<AcceptedResult>(await controller.Request(
            new ExternalAccountDeletionRequest { Email = "unknown@example.com" },
            CancellationToken.None));

        Assert.Equal(GetMessage(existingResponse.Value), GetMessage(unknownResponse.Value));
        Assert.Single(emailSender.Messages);
        Assert.Equal(0, emailSender.SentCount);
        var record = await context.AccountDeletionVerificationTokens.SingleAsync();
        var token = ExtractToken(emailSender.Messages[0].Body);
        Assert.Equal(
            Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))),
            record.TokenHash);
        Assert.NotEqual(token, record.TokenHash);
        Assert.Equal(user.Id, record.UserId);
        Assert.True(record.ExpiresAtUtc > record.CreatedAtUtc);
    }

    [Fact]
    public async Task DuplicateRequestDoesNotSendAnotherEmailWhileTokenIsPending()
    {
        await using var context = CreateContext();
        context.Users.Add(CreateUser("person@example.com"));
        await context.SaveChangesAsync();
        var emailSender = new TestEmailSender();
        var service = CreateService(context, emailSender);

        await service.RequestAsync("person@example.com", CancellationToken.None);
        await service.RequestAsync("person@example.com", CancellationToken.None);

        Assert.Single(emailSender.Messages);
        Assert.Single(await context.AccountDeletionVerificationTokens.ToListAsync());
    }

    [Fact]
    public async Task ValidTokenDeletesAccountThroughSharedServiceAndCannotBeReplayed()
    {
        await using var context = CreateContext();
        var user = CreateUser("person@example.com");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var emailSender = new TestEmailSender();
        var service = CreateService(context, emailSender);
        await service.RequestAsync(user.Email, CancellationToken.None);
        var token = ExtractToken(emailSender.Messages.Single().Body);

        var firstResult = await service.VerifyAsync(token, CancellationToken.None);
        var replayResult = await service.VerifyAsync(token, CancellationToken.None);

        Assert.Equal(ExternalAccountDeletionVerificationResult.Deleted, firstResult);
        Assert.Equal(ExternalAccountDeletionVerificationResult.InvalidOrExpired, replayResult);
        Assert.False(await context.Users.AnyAsync(candidate => candidate.Id == user.Id));
        Assert.Single(await context.AccountDeletionAudits.ToListAsync());
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
        var service = CreateService(context, emailSender);
        await service.RequestAsync(user.Email, CancellationToken.None);

        var result = await service.VerifyAsync(
            ExtractToken(emailSender.Messages.Single().Body),
            CancellationToken.None);

        Assert.Equal(ExternalAccountDeletionVerificationResult.UnableToComplete, result);
        Assert.True(await context.Users.AnyAsync(candidate => candidate.Id == user.Id));
    }

    [Fact]
    public async Task EmailQueueFailureInvalidatesTokenAndKeepsGenericResponse()
    {
        await using var context = CreateContext();
        context.Users.Add(CreateUser("person@example.com"));
        await context.SaveChangesAsync();
        var result = await CreateService(context, new TestEmailSender { ShouldFail = true })
            .RequestAsync("person@example.com", CancellationToken.None);

        Assert.Equal(ExternalAccountDeletionRequestResult.Accepted, result);
        Assert.True((await context.AccountDeletionVerificationTokens.SingleAsync()).UsedAtUtc.HasValue);
    }

    [Fact]
    public async Task EmailDispatcherInvalidatesTokenWhenProviderDeliveryFails()
    {
        var databaseName = Guid.NewGuid().ToString();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;
        var token = new AccountDeletionVerificationToken
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            TokenHash = HashToken("queued-token"),
            CreatedAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(30)
        };
        await using (var seedContext = new AppDbContext(options))
        {
            seedContext.Users.Add(CreateUserWithId(token.UserId, "person@example.com"));
            seedContext.AccountDeletionVerificationTokens.Add(token);
            await seedContext.SaveChangesAsync();
        }

        var emailSender = new TestEmailSender { ShouldFail = true };
        var services = new ServiceCollection()
            .AddDbContext<AppDbContext>(builder => builder.UseInMemoryDatabase(databaseName))
            .AddSingleton<IEmailSender>(emailSender)
            .BuildServiceProvider();
        var queue = new ExternalAccountDeletionEmailQueue();
        Assert.True(queue.TryQueue(new ExternalAccountDeletionEmail(
            token.Id,
            "person@example.com",
            "Confirm deletion",
            "verification link")));
        var dispatcher = new ExternalAccountDeletionEmailDispatcher(
            queue,
            services.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<ExternalAccountDeletionEmailDispatcher>.Instance);

        await dispatcher.StartAsync(CancellationToken.None);
        await emailSender.EmailAttempted.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await dispatcher.StopAsync(CancellationToken.None);

        await using var verifyContext = new AppDbContext(options);
        Assert.True((await verifyContext.AccountDeletionVerificationTokens.SingleAsync()).UsedAtUtc.HasValue);
    }

    [Fact]
    public async Task DeletionFailureIsNotReportedAsSuccessful()
    {
        await using var context = CreateContext();
        var user = CreateUser("person@example.com");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var emailSender = new TestEmailSender();
        var service = CreateService(context, emailSender, new ThrowingAccountDeletionService());
        await service.RequestAsync(user.Email, CancellationToken.None);

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
        var service = CreateService(context, emailSender);
        await service.RequestAsync(user.Email, CancellationToken.None);
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
        Assert.NotNull(typeof(ExternalAccountDeletionController).GetCustomAttributes(typeof(AllowAnonymousAttribute), true).SingleOrDefault());
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
        IAccountDeletionService? accountDeletionService = null)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AccountDeletion:VerificationUrl"] = "https://example.com/delete-account",
                ["AccountDeletion:VerificationTokenLifetimeMinutes"] = "30"
            })
            .Build();
        return new ExternalAccountDeletionService(
            context,
            accountDeletionService ?? new AccountDeletionService(context),
            emailSender,
            emailSender,
            configuration,
            NullLogger<ExternalAccountDeletionService>.Instance);
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static User CreateUser(string email)
    {
        return CreateUserWithId(Guid.NewGuid(), email);
    }

    private static User CreateUserWithId(Guid id, string email)
    {
        var user = new User
        {
            Id = id,
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

    private sealed class TestEmailSender : IEmailSender, IExternalAccountDeletionEmailQueue
    {
        public bool IsConfigured => true;
        public bool ShouldFail { get; init; }
        public int SentCount { get; private set; }
        public TaskCompletionSource EmailAttempted { get; } =
            new(TaskCreationOptions.RunContinuationsAsynchronously);
        public List<(string Recipient, string Body)> Messages { get; } = [];

        public bool TryQueue(ExternalAccountDeletionEmail email)
        {
            if (ShouldFail)
                return false;

            Messages.Add((email.Recipient, email.Body));
            return true;
        }

        public Task SendAsync(string recipient, string subject, string body)
        {
            SentCount++;
            EmailAttempted.TrySetResult();
            if (ShouldFail)
                throw new InvalidOperationException("Delivery failed.");

            Messages.Add((recipient, body));
            return Task.CompletedTask;
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
