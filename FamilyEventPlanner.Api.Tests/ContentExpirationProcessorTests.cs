using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace FamilyEventPlanner.Api.Tests;

public class ContentExpirationProcessorTests
{
    [Fact]
    public async Task SendsOnePrivateWarningWithinTwentyFourHoursOfExpiration()
    {
        await using var context = CreateContext();
        var (group, member) = SeedMember(context);
        var now = DateTime.UtcNow;
        context.Polls.Add(CreatePoll(group.Id, member.Id, now.AddHours(24)));
        context.Announcements.Add(new Announcement
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            CreatedByMemberId = member.Id,
            Title = "Dinner",
            Body = "Dinner is ready.",
            CreatedAt = now,
            ExpiresAt = now.AddHours(2)
        });
        await context.SaveChangesAsync();

        var processor = new ContentExpirationProcessor(context);
        await processor.ProcessAsync(now);
        await processor.ProcessAsync(now.AddMinutes(15));

        var notifications = await context.Notifications.OrderBy(notification => notification.Type).ToListAsync();
        Assert.Equal(2, notifications.Count);
        Assert.Contains(notifications, notification =>
            notification.MemberId == member.Id &&
            notification.Type == "PollExpiring" &&
            notification.Link.StartsWith("/poll/") &&
            notification.Message.Contains("about to expire"));
        Assert.Contains(notifications, notification =>
            notification.MemberId == member.Id &&
            notification.Type == "AnnouncementExpiring" &&
            notification.Link.StartsWith("/announcement/"));
        Assert.All(await context.Polls.ToListAsync(), poll => Assert.True(poll.ExpirationNotificationSent));
        Assert.All(await context.Announcements.ToListAsync(), announcement =>
            Assert.True(announcement.ExpirationNotificationSent));
    }

    [Fact]
    public async Task DeletesExpiredPollDependentsAndAnnouncementReferences()
    {
        await using var context = CreateContext();
        var (group, member) = SeedMember(context);
        var now = DateTime.UtcNow;
        var expiredPoll = CreatePoll(group.Id, member.Id, now.AddMinutes(-1));
        var activePoll = CreatePoll(group.Id, member.Id, now.AddDays(5));
        var expiredAnnouncement = new Announcement
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            CreatedByMemberId = member.Id,
            Title = "Expired",
            Body = "Expired announcement.",
            CreatedAt = now.AddDays(-15),
            ExpiresAt = now.AddMinutes(-1)
        };
        context.Polls.AddRange(expiredPoll, activePoll);
        context.Announcements.Add(expiredAnnouncement);
        context.ActivityFeed.AddRange(
            CreateActivity(group.Id, member.Id, expiredPoll.Id, "Poll"),
            CreateActivity(group.Id, member.Id, expiredAnnouncement.Id, "Announcement"));
        context.Notifications.AddRange(
            new Notification
            {
                Id = Guid.NewGuid(),
                MemberId = member.Id,
                Message = "Poll expiring.",
                Type = "PollExpiring",
                Link = $"/poll/{expiredPoll.Id}",
                CreatedAt = now
            },
            new Notification
            {
                Id = Guid.NewGuid(),
                MemberId = member.Id,
                Message = "Announcement expiring.",
                Type = "AnnouncementExpiring",
                Link = $"/announcement/{expiredAnnouncement.Id}",
                CreatedAt = now
            });
        await context.SaveChangesAsync();
        context.PollVotes.Add(new PollVote
        {
            Id = Guid.NewGuid(),
            PollOptionId = expiredPoll.Options[0].Id,
            MemberId = member.Id,
            CreatedAt = now.AddDays(-1)
        });
        await context.SaveChangesAsync();

        await new ContentExpirationProcessor(context).ProcessAsync(now);

        Assert.Empty(await context.Polls.Where(poll => poll.Id == expiredPoll.Id).ToListAsync());
        Assert.Single(await context.Polls.Where(poll => poll.Id == activePoll.Id).ToListAsync());
        Assert.Empty(await context.PollOptions.Where(option => option.PollId == expiredPoll.Id).ToListAsync());
        Assert.Empty(await context.PollVotes.ToListAsync());
        Assert.Empty(await context.Announcements.ToListAsync());
        Assert.Empty(await context.ActivityFeed.ToListAsync());
        Assert.Empty(await context.Notifications.ToListAsync());
    }

    [Fact]
    public async Task FailedCleanupCanBeRetriedWithoutPartialDeletion()
    {
        var databaseName = Guid.NewGuid().ToString();
        var options = CreateOptions(databaseName);
        (FamilyGroup Group, GroupMember Member) seeded;
        using (var setupContext = new AppDbContext(options))
            seeded = SeedMember(setupContext);
        var (group, member) = seeded;
        var expiredPoll = CreatePoll(group.Id, member.Id, DateTime.UtcNow.AddMinutes(-1));
        await using (var seedContext = new AppDbContext(options))
        {
            seedContext.Polls.Add(expiredPoll);
            await seedContext.SaveChangesAsync();
            seedContext.PollVotes.Add(new PollVote
            {
                Id = Guid.NewGuid(),
                PollOptionId = expiredPoll.Options[0].Id,
                MemberId = member.Id,
                CreatedAt = DateTime.UtcNow
            });
            await seedContext.SaveChangesAsync();
        }

        var failingOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .AddInterceptors(new FailOnceSaveChangesInterceptor())
            .Options;
        await using (var failingContext = new AppDbContext(failingOptions))
        {
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                new ContentExpirationProcessor(failingContext).ProcessAsync(DateTime.UtcNow));
        }

        await using (var retryContext = new AppDbContext(options))
        {
            Assert.Single(await retryContext.Polls.ToListAsync());
            Assert.Single(await retryContext.PollVotes.ToListAsync());
            await new ContentExpirationProcessor(retryContext).ProcessAsync(DateTime.UtcNow);
            Assert.Empty(await retryContext.Polls.ToListAsync());
            Assert.Empty(await retryContext.PollOptions.ToListAsync());
            Assert.Empty(await retryContext.PollVotes.ToListAsync());
        }
    }

    private static Poll CreatePoll(Guid groupId, Guid memberId, DateTime expiresAt)
    {
        var pollId = Guid.NewGuid();
        return new Poll
        {
            Id = pollId,
            FamilyGroupId = groupId,
            CreatedByMemberId = memberId,
            Question = "Choose",
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = expiresAt,
            Options =
            [
                new PollOption { Id = Guid.NewGuid(), PollId = pollId, Text = "One" },
                new PollOption { Id = Guid.NewGuid(), PollId = pollId, Text = "Two" }
            ]
        };
    }

    private static ActivityFeed CreateActivity(Guid groupId, Guid memberId, Guid entityId, string entityType) =>
        new()
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = groupId,
            ActorMemberId = memberId,
            ActivityType = $"{entityType}Created",
            RelatedEntityId = entityId,
            RelatedEntityType = entityType,
            CreatedAtUtc = DateTime.UtcNow
        };

    private static (FamilyGroup Group, GroupMember Member) SeedMember(AppDbContext context)
    {
        var group = new FamilyGroup { Id = Guid.NewGuid(), Name = "Family", CreatedAt = DateTime.UtcNow };
        var user = new User { Id = Guid.NewGuid(), Email = "member@example.com", DisplayName = "Member" };
        var member = new GroupMember
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            UserId = user.Id,
            User = user,
            JoinedAt = DateTime.UtcNow
        };
        context.FamilyGroups.Add(group);
        context.Users.Add(user);
        context.GroupMembers.Add(member);
        context.SaveChanges();
        return (group, member);
    }

    private static AppDbContext CreateContext() => new(CreateOptions(Guid.NewGuid().ToString()));

    private static DbContextOptions<AppDbContext> CreateOptions(string databaseName) =>
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;

    private sealed class FailOnceSaveChangesInterceptor : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            throw new InvalidOperationException("Simulated database failure.");
        }
    }
}
