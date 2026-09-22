using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Models.Auth;
using FamilyEventPlanner.Api.Services;
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
        var controller = new AuthController(context, new TestTokenService());

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
        var controller = new AuthController(context, new TestTokenService());

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
        var controller = new AuthController(context, new TestTokenService());

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

    private sealed class TestTokenService : ITokenService
    {
        public string GenerateToken(Guid userId, string email, string displayName) => "test-token";
    }
}
