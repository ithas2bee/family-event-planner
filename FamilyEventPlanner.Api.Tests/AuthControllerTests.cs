using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Models.Auth;
using FamilyEventPlanner.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Tests;

public class AuthControllerTests
{
    [Fact]
    public async Task LoginWithLegacyPasswordMigratesAndAllowsLoginAgain()
    {
        const string password = "legacy-password";
        await using var context = CreateContext();
        var user = AddUser(context, password);
        var controller = CreateController(context);

        var firstResult = await controller.Login(new LoginRequest
        {
            Email = user.Email,
            Password = password
        });

        Assert.IsType<OkObjectResult>(firstResult);
        Assert.NotEqual(password, user.PasswordHash);
        Assert.NotNull(user.LastLoginAt);
        Assert.Equal(
            PasswordVerificationResult.Success,
            new PasswordHasher<User>().VerifyHashedPassword(user, user.PasswordHash!, password));

        var secondResult = await controller.Login(new LoginRequest
        {
            Email = user.Email,
            Password = password
        });

        Assert.IsType<OkObjectResult>(secondResult);
    }

    [Fact]
    public async Task LoginWithIncorrectLegacyPasswordReturnsUnauthorizedWithoutChangingPassword()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "legacy-password");
        var storedPassword = user.PasswordHash;
        var controller = CreateController(context);

        var result = await controller.Login(new LoginRequest
        {
            Email = user.Email,
            Password = "wrong-password"
        });

        Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal(storedPassword, user.PasswordHash);
        Assert.Null(user.LastLoginAt);
    }

    [Fact]
    public async Task LoginWithSecurePasswordHashAcceptsCorrectPasswordAndRejectsIncorrectPassword()
    {
        const string password = "secure-password";
        await using var context = CreateContext();
        var user = AddUser(context, null);
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, password);
        await context.SaveChangesAsync();
        var controller = CreateController(context);

        var success = await controller.Login(new LoginRequest
        {
            Email = user.Email,
            Password = password
        });

        Assert.IsType<OkObjectResult>(success);
        var hashAfterSuccess = user.PasswordHash;

        user.LastLoginAt = null;
        var failure = await controller.Login(new LoginRequest
        {
            Email = user.Email,
            Password = "wrong-password"
        });

        Assert.IsType<UnauthorizedObjectResult>(failure);
        Assert.Equal(hashAfterSuccess, user.PasswordHash);
        Assert.Null(user.LastLoginAt);
    }

    [Fact]
    public async Task ForgotPasswordReturnsSameConfirmationForRegisteredAndUnregisteredEmails()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "old-password");
        var emailSender = new TestEmailSender();
        var controller = CreateController(context, emailSender);

        var registeredResult = await controller.ForgotPassword(new ForgotPasswordRequest { Email = user.Email });
        var unregisteredResult = await controller.ForgotPassword(new ForgotPasswordRequest { Email = "missing@example.com" });

        var registeredResponse = Assert.IsType<OkObjectResult>(registeredResult);
        var unregisteredResponse = Assert.IsType<OkObjectResult>(unregisteredResult);
        Assert.Equal(GetMessage(registeredResponse), GetMessage(unregisteredResponse));
        Assert.Single(emailSender.SentEmails);
        Assert.Equal(user.Email, emailSender.SentEmails[0].Recipient);
        var token = ReadResetToken(emailSender.SentEmails[0].Body);
        Assert.DoesNotContain(token, GetMessage(registeredResponse));
        Assert.NotEqual(token, context.PasswordResetTokens.Single().TokenHash);
    }

    [Fact]
    public async Task ForgotPasswordDeliveryFailureKeepsGenericResponseAndInvalidatesToken()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "old-password");
        var emailSender = new TestEmailSender
        {
            Failure = new InvalidOperationException("Email delivery failed.")
        };
        var controller = CreateController(context, emailSender);

        var registeredResult = Assert.IsType<OkObjectResult>(
            await controller.ForgotPassword(new ForgotPasswordRequest { Email = user.Email }));
        var unregisteredResult = Assert.IsType<OkObjectResult>(
            await controller.ForgotPassword(new ForgotPasswordRequest { Email = "missing@example.com" }));

        Assert.Equal(GetMessage(registeredResult), GetMessage(unregisteredResult));
        Assert.DoesNotContain("Email delivery failed", GetMessage(registeredResult));
        Assert.DoesNotContain("token=", GetMessage(registeredResult));
        Assert.NotNull(context.PasswordResetTokens.Single().UsedAtUtc);
    }

    [Fact]
    public async Task ResetPasswordRejectsInvalidAndExpiredTokens()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "old-password");
        var emailSender = new TestEmailSender();
        var controller = CreateController(context, emailSender);
        await controller.ForgotPassword(new ForgotPasswordRequest { Email = user.Email });
        var token = ReadResetToken(emailSender.SentEmails[0].Body);

        var invalidResult = await controller.ResetPassword(CreateResetRequest("invalid-token"));
        Assert.IsType<BadRequestObjectResult>(invalidResult);

        var resetRecord = await context.PasswordResetTokens.SingleAsync();
        resetRecord.ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1);
        await context.SaveChangesAsync();
        var expiredResult = await controller.ResetPassword(CreateResetRequest(token));

        Assert.IsType<BadRequestObjectResult>(expiredResult);
        Assert.Equal("old-password", user.PasswordHash);
    }

    [Fact]
    public async Task ResetPasswordChangesPasswordAndCannotReuseToken()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "old-password");
        var emailSender = new TestEmailSender();
        var controller = CreateController(context, emailSender);
        await controller.ForgotPassword(new ForgotPasswordRequest { Email = user.Email });
        var token = ReadResetToken(emailSender.SentEmails[0].Body);

        var resetResult = await controller.ResetPassword(CreateResetRequest(token));
        var passwordHash = user.PasswordHash;
        var reusedResult = await controller.ResetPassword(CreateResetRequest(token));
        var oldPasswordResult = await controller.Login(new LoginRequest { Email = user.Email, Password = "old-password" });
        var newPasswordResult = await controller.Login(new LoginRequest { Email = user.Email, Password = "New-password1!" });

        Assert.IsType<OkObjectResult>(resetResult);
        Assert.IsType<BadRequestObjectResult>(reusedResult);
        Assert.NotEqual("old-password", passwordHash);
        Assert.IsType<UnauthorizedObjectResult>(oldPasswordResult);
        Assert.IsType<OkObjectResult>(newPasswordResult);
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static User AddUser(AppDbContext context, string? passwordHash)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "user@example.com",
            DisplayName = "Test User",
            CreatedAt = DateTime.UtcNow,
            PasswordHash = passwordHash
        };
        context.Users.Add(user);
        context.SaveChanges();
        return user;
    }

    private static AuthController CreateController(AppDbContext context, TestEmailSender? emailSender = null)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["PasswordReset:DeepLinkUrl"] = "familyeventplannermobile://reset-password"
            })
            .Build();
        return new AuthController(context, new TestTokenService(), emailSender ?? new TestEmailSender(), configuration);
    }

    private static ResetPasswordRequest CreateResetRequest(string token) => new()
    {
        Token = token,
        Password = "New-password1!",
        ConfirmPassword = "New-password1!"
    };

    private static string GetMessage(OkObjectResult result) =>
        (string)result.Value!.GetType().GetProperty("message")!.GetValue(result.Value)!;

    private static string ReadResetToken(string emailBody)
    {
        var token = emailBody.Split("?token=")[1].Split('\n')[0];
        return Uri.UnescapeDataString(token);
    }

    private sealed class TestTokenService : ITokenService
    {
        public string GenerateToken(Guid userId, string email, string displayName) => "test-token";
    }

    private sealed class TestEmailSender : IEmailSender
    {
        public bool IsConfigured => true;

        public Exception? Failure { get; init; }

        public List<(string Recipient, string Subject, string Body)> SentEmails { get; } = [];

        public Task SendAsync(string recipient, string subject, string body)
        {
            if (Failure is not null)
            {
                throw Failure;
            }

            SentEmails.Add((recipient, subject, body));
            return Task.CompletedTask;
        }
    }
}
