using System.Net;
using System.Net.Http.Json;
using FamilyEventPlanner.Api.Constants;
using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

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
                Assert.True(await seedContext.Users.AnyAsync(user =>
                    user.Id == SystemConstants.UnknownGuestUserId));
                seedContext.Users.AddRange(
                    Enumerable.Range(0, 99).Select(index => new User
                    {
                        Id = Guid.NewGuid(),
                        Email = $"registration-seed-{index}@example.com",
                        DisplayName = $"Seed User {index}",
                        CreatedAt = DateTime.UtcNow
                    }));
                await seedContext.SaveChangesAsync();
                Assert.Equal(
                    99,
                    await seedContext.Users.CountAsync(user => user.Id != SystemConstants.UnknownGuestUserId));
                Assert.Equal(100, await seedContext.Users.CountAsync());
            }

            await using (var application = CreateApiApplication(testConnectionString))
            {
                await application.StartAsync();
                var server = application.Services.GetRequiredService<IServer>();
                var address = server.Features.Get<IServerAddressesFeature>()!.Addresses.Single();
                using var client = new HttpClient { BaseAddress = new Uri(address) };
                var responses = await Task.WhenAll(Enumerable.Range(0, 10).Select(index =>
                    client.PostAsJsonAsync("/api/auth/register", new
                    {
                        email = $"registration-attempt-{index}@example.com",
                        displayName = $"New User {index}",
                        password = "Password1!"
                    })));

                Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Created);
                Assert.Equal(
                    9,
                    responses.Count(response => response.StatusCode == HttpStatusCode.Conflict));
                Assert.All(responses, response =>
                    Assert.Contains(
                        response.StatusCode,
                        new[] { HttpStatusCode.Created, HttpStatusCode.Conflict }));
                foreach (var response in responses)
                {
                    response.Dispose();
                }
            }

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

    private static WebApplication CreateApiApplication(string connectionString)
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            EnvironmentName = "Development"
        });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Registration:MaxAccounts"] = "100"
        });
        builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connectionString));
        builder.Services.AddSingleton<ITokenService, TestTokenService>();
        builder.Services.AddSingleton<IEmailSender, TestEmailSender>();
        builder.Services
            .AddControllers()
            .AddApplicationPart(typeof(AuthController).Assembly);
        var application = builder.Build();
        application.MapControllers();
        return application;
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
