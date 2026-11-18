using System.Data.Common;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Services;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;

namespace FamilyEventPlanner.Api.Tests;

public sealed class AccountDeletionSqlServerIntegrationTests
{
    private const string ConnectionStringEnvironmentVariable = "FAMILY_EVENT_PLANNER_TEST_SQLSERVER";

    [SqlServerFact]
    public async Task AccountDeletionMigrationAndWorkflowRespectSqlServerConstraints()
    {
        var (masterConnectionString, testConnectionString, databaseName) = await CreateTestDatabaseAsync();
        try
        {
            Guid userId;
            Guid otherMemberId;
            Guid communityId;
            Guid eventId;
            Guid pollId;
            Guid kickbackId;
            await using (var seedContext = CreateContext(testConnectionString))
            {
                await seedContext.Database.MigrateAsync();
                (userId, otherMemberId, communityId, eventId, pollId, kickbackId) =
                    await SeedDeletionScenarioAsync(seedContext);
            }

            await using (var context = CreateContext(testConnectionString))
            {
                var result = await new AccountDeletionService(context)
                    .DeleteAsync(userId, "integration-password", CancellationToken.None);
                Assert.Equal(AccountDeletionResult.Deleted, result);
            }

            await using var verifyContext = CreateContext(testConnectionString);
            Assert.False(await verifyContext.Users.AnyAsync(user => user.Id == userId));
            Assert.True(await verifyContext.Users.AnyAsync(user => user.Id == FamilyEventPlanner.Api.Constants.SystemConstants.UnknownGuestUserId));
            Assert.False(await verifyContext.GroupMembers.AnyAsync(member => member.UserId == userId));
            Assert.True(await verifyContext.GroupMembers.AnyAsync(member => member.Id == otherMemberId));
            Assert.True(await verifyContext.FamilyGroups.AnyAsync(group => group.Id == communityId));
            Assert.True(await verifyContext.FamilyEvents.AnyAsync(eventItem =>
                eventItem.Id == eventId && eventItem.CreatedByMemberId == null));
            Assert.True(await verifyContext.Polls.AnyAsync(poll =>
                poll.Id == pollId && poll.CreatedByMemberId == null));
            Assert.True(await verifyContext.Kickbacks.AnyAsync(kickback =>
                kickback.Id == kickbackId && kickback.CreatedByMemberId == null));
            Assert.Empty(await verifyContext.EventAttendances.ToListAsync());
            Assert.Empty(await verifyContext.PollVotes.ToListAsync());
            Assert.Empty(await verifyContext.KickbackResponses.ToListAsync());
            Assert.Empty(await verifyContext.Notifications.Where(notification => notification.MemberId != otherMemberId).ToListAsync());
            Assert.Null((await verifyContext.Photos.SingleAsync()).UploadedById);
            Assert.Null((await verifyContext.EventAssignments.SingleAsync()).AssignedToId);
            Assert.Empty(await verifyContext.PasswordResetTokens.ToListAsync());
            Assert.Empty(await verifyContext.GroupMembershipRequests.ToListAsync());
            Assert.Single(await verifyContext.AccountDeletionAudits.ToListAsync());
        }
        finally
        {
            await DropDatabaseAsync(masterConnectionString, databaseName);
        }
    }

    [SqlServerFact]
    public async Task AccountDeletionFailureBeforeCommitRollsBackAllSqlServerChanges()
    {
        var (masterConnectionString, testConnectionString, databaseName) = await CreateTestDatabaseAsync();
        try
        {
            Guid userId;
            Guid memberId;
            await using (var seedContext = CreateContext(testConnectionString))
            {
                await seedContext.Database.MigrateAsync();
                (userId, memberId, _, _, _, _) = await SeedDeletionScenarioAsync(seedContext);
            }

            var failureInterceptor = new FailOnUserDeleteCommandInterceptor();
            var failureOptions = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlServer(testConnectionString)
                .AddInterceptors(failureInterceptor)
                .Options;
            await using (var failingContext = new AppDbContext(failureOptions))
            {
                await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    new AccountDeletionService(failingContext)
                        .DeleteAsync(userId, "integration-password", CancellationToken.None));
            }

            Assert.True(failureInterceptor.FailureWasTriggered);
            await using var verifyContext = CreateContext(testConnectionString);
            Assert.True(await verifyContext.Users.AnyAsync(user => user.Id == userId));
            Assert.True(await verifyContext.GroupMembers.AnyAsync(member => member.Id == memberId));
            Assert.Single(await verifyContext.EventAttendances.ToListAsync());
            Assert.Single(await verifyContext.PollVotes.ToListAsync());
            Assert.Single(await verifyContext.KickbackResponses.ToListAsync());
            Assert.Single(await verifyContext.Photos.ToListAsync());
            Assert.Single(await verifyContext.EventAssignments.ToListAsync());
            Assert.Empty(await verifyContext.AccountDeletionAudits.ToListAsync());
        }
        finally
        {
            await DropDatabaseAsync(masterConnectionString, databaseName);
        }
    }

    private static async Task<(string Master, string Test, string Name)> CreateTestDatabaseAsync()
    {
        var configuredConnectionString = Environment.GetEnvironmentVariable(ConnectionStringEnvironmentVariable)!;
        var databaseName = $"FamilyEventPlannerAccountDeletionTest_{Guid.NewGuid():N}";
        var masterConnectionString = new SqlConnectionStringBuilder(configuredConnectionString)
        {
            InitialCatalog = "master"
        }.ConnectionString;
        var testConnectionString = new SqlConnectionStringBuilder(configuredConnectionString)
        {
            InitialCatalog = databaseName
        }.ConnectionString;

        await using var connection = new SqlConnection(masterConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = $"CREATE DATABASE [{databaseName}]";
        await command.ExecuteNonQueryAsync();
        return (masterConnectionString, testConnectionString, databaseName);
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

    private static async Task<(Guid UserId, Guid OtherMemberId, Guid GroupId, Guid EventId, Guid PollId, Guid KickbackId)>
        SeedDeletionScenarioAsync(AppDbContext context)
    {
        var user = CreateUser("delete-me@example.com");
        var otherUser = CreateUser("keep-me@example.com");
        var group = new FamilyGroup
        {
            Id = Guid.NewGuid(),
            Name = "Account deletion integration",
            InviteCode = Guid.NewGuid().ToString("N"),
            CreatedAt = DateTime.UtcNow
        };
        var member = CreateMember(user, group.Id);
        var otherMember = CreateMember(otherUser, group.Id, isAdmin: true);
        var role = new CommunityRole
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            Name = "Volunteer",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var eventItem = new FamilyEvent
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            Title = "Shared event",
            StartDate = DateTime.UtcNow,
            CreatedByMemberId = member.Id
        };
        var assignment = new EventAssignment
        {
            Id = Guid.NewGuid(),
            FamilyEventId = eventItem.Id,
            Title = "Shared assignment",
            AssignedToId = member.Id,
            Status = AssignmentStatus.Assigned
        };
        var poll = new Poll
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            Question = "Shared poll",
            CreatedByMemberId = member.Id,
            CreatedAt = DateTime.UtcNow,
            Options = [new PollOption { Id = Guid.NewGuid(), Text = "Option" }]
        };
        var kickback = new Kickback
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            Vibe = "Shared kickback",
            CreatedByMemberId = member.Id,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(1),
            CreatedAtUtc = DateTime.UtcNow
        };

        context.Users.AddRange(user, otherUser);
        context.FamilyGroups.Add(group);
        context.GroupMembers.AddRange(member, otherMember);
        context.CommunityRoles.Add(role);
        context.CommunityRoleAssignments.Add(new CommunityRoleAssignment
        {
            FamilyGroupId = group.Id,
            GroupMemberId = member.Id,
            CommunityRoleId = role.Id
        });
        context.FamilyEvents.Add(eventItem);
        context.EventAssignments.Add(assignment);
        context.EventAttendances.Add(new EventAttendance
        {
            Id = Guid.NewGuid(),
            FamilyEventId = eventItem.Id,
            MemberId = member.Id
        });
        context.Polls.Add(poll);
        context.PollVotes.Add(new PollVote
        {
            Id = Guid.NewGuid(),
            PollOptionId = poll.Options.Single().Id,
            MemberId = member.Id,
            CreatedAt = DateTime.UtcNow
        });
        context.Photos.Add(new Photo
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            UploadedById = member.Id,
            FilePath = "integration/shared.jpg",
            UploadedAt = DateTime.UtcNow
        });
        context.Announcements.Add(new Announcement
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            Title = "Shared announcement",
            Body = "Community news",
            CreatedByMemberId = member.Id,
            CreatedAt = DateTime.UtcNow
        });
        context.Kickbacks.Add(kickback);
        context.KickbackResponses.Add(new KickbackResponse
        {
            Id = Guid.NewGuid(),
            KickbackId = kickback.Id,
            MemberId = member.Id,
            ResponseType = "Maybe",
            CreatedAtUtc = DateTime.UtcNow
        });
        context.Notifications.AddRange(
            new Notification
            {
                Id = Guid.NewGuid(),
                MemberId = member.Id,
                Message = "Delete with user",
                CreatedAt = DateTime.UtcNow
            },
            new Notification
            {
                Id = Guid.NewGuid(),
                MemberId = otherMember.Id,
                Message = "Keep for other member",
                CreatedAt = DateTime.UtcNow
            });
        context.ActivityFeed.Add(new ActivityFeed
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            ActorMemberId = member.Id,
            ActivityType = "EventCreated",
            MetadataJson = "{\"title\":\"Shared event\"}",
            CreatedAtUtc = DateTime.UtcNow
        });
        context.PasswordResetTokens.Add(new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = Guid.NewGuid().ToString("N"),
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(30)
        });
        context.GroupMembershipRequests.Add(new GroupMembershipRequest
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            FamilyGroupId = group.Id,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        return (user.Id, otherMember.Id, group.Id, eventItem.Id, poll.Id, kickback.Id);
    }

    private static AppDbContext CreateContext(string connectionString)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(connectionString)
            .Options;
        return new AppDbContext(options);
    }

    private static User CreateUser(string email) => new()
    {
        Id = Guid.NewGuid(),
        Email = email,
        DisplayName = email.Split('@')[0],
        PasswordHash = "integration-password",
        CreatedAt = DateTime.UtcNow
    };

    private static GroupMember CreateMember(User user, Guid groupId, bool isAdmin = false) => new()
    {
        Id = Guid.NewGuid(),
        FamilyGroupId = groupId,
        UserId = user.Id,
        IsAdmin = isAdmin,
        JoinedAt = DateTime.UtcNow
    };

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

    private sealed class FailOnUserDeleteCommandInterceptor : DbCommandInterceptor
    {
        public bool FailureWasTriggered { get; private set; }

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<DbDataReader> result,
            CancellationToken cancellationToken = default)
        {
            if (command.CommandText.Contains("DELETE FROM [Users]", StringComparison.OrdinalIgnoreCase))
            {
                FailureWasTriggered = true;
                return ValueTask.FromException<InterceptionResult<DbDataReader>>(
                    new InvalidOperationException("Simulated failure before account deletion commit."));
            }

            return ValueTask.FromResult(result);
        }
    }
}
