using FamilyEventPlanner.Api.Constants;
using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Models.Auth;
using FamilyEventPlanner.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace FamilyEventPlanner.Api.Tests;

public class RegistrationSqlServerIntegrationTests
{
    private const string ConnectionStringEnvironmentVariable = "FAMILY_EVENT_PLANNER_TEST_SQLSERVER";

    [SqlServerFact]
    public async Task ConcurrentRegistrationAtNinetyNineAccountsCreatesExactlyOneHundredthAccount()
    {
        var configuredConnectionString = Environment.GetEnvironmentVariable(ConnectionStringEnvironmentVariable)!;
        var databaseName = $"FamilyEventPlannerRegistrationTest_{Guid.NewGuid():N}";
        var masterConnectionString = new SqlConnectionStringBuilder(configuredConnectionString)
        {
            InitialCatalog = "master"
        };
        var testConnectionString = new SqlConnectionStringBuilder(configuredConnectionString)
        {
            InitialCatalog = databaseName
        }.ConnectionString;

        await CreateDatabaseAsync(masterConnectionString.ConnectionString, databaseName);
        try
        {
            await using (var seedContext = CreateContext(testConnectionString))
            {
                await seedContext.Database.MigrateAsync();
                seedContext.Users.AddRange(
                    Enumerable.Range(0, 99).Select(index => new User
                    {
                        Id = Guid.NewGuid(),
                        Email = $"registration-seed-{index}@example.com",
                        DisplayName = $"Seed User {index}",
                        CreatedAt = DateTime.UtcNow
                    }));
                seedContext.Users.Add(new User
                {
                    Id = SystemConstants.UnknownGuestUserId,
                    Email = SystemConstants.UnknownGuestEmail,
                    DisplayName = SystemConstants.UnknownGuestDisplayName,
                    CreatedAt = DateTime.UtcNow
                });
                await seedContext.SaveChangesAsync();
            }

            var requests = Enumerable.Range(0, 10).Select(async index =>
            {
                await using var requestContext = CreateContext(testConnectionString);
                var controller = CreateController(requestContext);
                return await controller.Register(new RegisterRequest
                {
                    Email = $"registration-attempt-{index}@example.com",
                    DisplayName = $"New User {index}",
                    Password = "Password1!"
                });
            });

            var results = await Task.WhenAll(requests);

            var createdResults = results.OfType<CreatedAtActionResult>().ToArray();
            var conflictResults = results.OfType<ConflictObjectResult>().ToArray();
            Assert.Single(createdResults);
            Assert.Equal(201, createdResults[0].StatusCode);
            Assert.Equal(9, conflictResults.Length);
            Assert.All(conflictResults, result => Assert.Equal(409, result.StatusCode));

            await using var verificationContext = CreateContext(testConnectionString);
            Assert.Equal(
                100,
                await verificationContext.Users.CountAsync(user => user.Id != SystemConstants.UnknownGuestUserId));
            Assert.Equal(101, await verificationContext.Users.CountAsync());
            Assert.True(await verificationContext.Users.AnyAsync(user => user.Id == SystemConstants.UnknownGuestUserId));
        }
        finally
        {
            await DropDatabaseAsync(masterConnectionString.ConnectionString, databaseName);
        }
    }

    private static AppDbContext CreateContext(string connectionString)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(connectionString)
            .Options;
        return new AppDbContext(options);
    }

    private static AuthController CreateController(AppDbContext context)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Registration:MaxAccounts"] = "100"
            })
            .Build();
        return new AuthController(context, new TestTokenService(), new TestEmailSender(), configuration);
    }

    private static async Task CreateDatabaseAsync(string connectionString, string databaseName)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = $"CREATE DATABASE [{databaseName}]";
        await command.ExecuteNonQueryAsync();
    }

    private static async Task DropDatabaseAsync(string connectionString, string databaseName)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText =
            $"ALTER DATABASE [{databaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{databaseName}]";
        await command.ExecuteNonQueryAsync();
    }

    private sealed class SqlServerFactAttribute : FactAttribute
    {
        public SqlServerFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(ConnectionStringEnvironmentVariable)))
            {
                Skip = $"Set {ConnectionStringEnvironmentVariable} to a SQL Server connection string with permission to create and drop databases.";
            }
        }
    }

    private sealed class TestTokenService : ITokenService
    {
        public string GenerateToken(Guid userId, string email, string displayName) => "test-token";
    }

    private sealed class TestEmailSender : IEmailSender
    {
        public bool IsConfigured => false;

        public Task SendAsync(string recipient, string subject, string body) => Task.CompletedTask;
    }
}
