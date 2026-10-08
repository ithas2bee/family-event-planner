using System.Security.Claims;
using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Tests;

public class CommunityContentDeletionTests
{
    [Fact]
    public async Task GroupAdminCanDeleteAllCommunityContentTypes()
    {
        await using var context = CreateContext();
        var content = await SeedContent(context);

        Assert.IsType<NoContentResult>(await CreateEventsController(context, content.Admin.Id).DeleteEvent(content.Event.Id));
        Assert.IsType<NoContentResult>(await CreateKickbacksController(context, content.Admin.Id).Delete(content.Kickback.Id));
        Assert.IsType<NoContentResult>(await CreatePollsController(context, content.Admin.Id).Delete(content.Poll.Id));
        Assert.IsType<NoContentResult>(await CreateAnnouncementsController(context, content.Admin.Id).Delete(content.Announcement.Id));

        Assert.Empty(await context.FamilyEvents.ToListAsync());
        Assert.Empty(await context.Kickbacks.ToListAsync());
        Assert.Empty(await context.Polls.ToListAsync());
        Assert.Empty(await context.Announcements.ToListAsync());
        Assert.Empty(await context.PollOptions.ToListAsync());
        Assert.Empty(await context.PollVotes.ToListAsync());
        Assert.Empty(await context.ActivityFeed.ToListAsync());
        Assert.Empty(await context.Notifications.ToListAsync());
    }

    [Fact]
    public async Task RegularMemberCannotDeleteCommunityContent()
    {
        await using var context = CreateContext();
        var content = await SeedContent(context);

        Assert.IsType<ForbidResult>(await CreateEventsController(context, content.Member.Id).DeleteEvent(content.Event.Id));
        Assert.IsType<ForbidResult>(await CreateKickbacksController(context, content.Member.Id).Delete(content.Kickback.Id));
        Assert.IsType<ForbidResult>(await CreatePollsController(context, content.Member.Id).Delete(content.Poll.Id));
        Assert.IsType<ForbidResult>(await CreateAnnouncementsController(context, content.Member.Id).Delete(content.Announcement.Id));

        Assert.Equal(1, await context.FamilyEvents.CountAsync());
        Assert.Equal(1, await context.Kickbacks.CountAsync());
        Assert.Equal(1, await context.Polls.CountAsync());
        Assert.Equal(1, await context.Announcements.CountAsync());
        Assert.Single(await context.Notifications.ToListAsync());
    }

    [Fact]
    public async Task AdminFromAnotherGroupCannotDeleteCommunityContent()
    {
        await using var context = CreateContext();
        var content = await SeedContent(context);
        var otherGroup = new FamilyGroup { Id = Guid.NewGuid(), Name = "Other group", CreatedAt = DateTime.UtcNow };
        context.FamilyGroups.Add(otherGroup);
        var otherAdmin = AddMember(context, otherGroup.Id, "other-admin@example.com", true);
        await context.SaveChangesAsync();

        Assert.IsType<ForbidResult>(await CreateEventsController(context, otherAdmin.Id).DeleteEvent(content.Event.Id));
        Assert.IsType<ForbidResult>(await CreateKickbacksController(context, otherAdmin.Id).Delete(content.Kickback.Id));
        Assert.IsType<ForbidResult>(await CreatePollsController(context, otherAdmin.Id).Delete(content.Poll.Id));
        Assert.IsType<ForbidResult>(await CreateAnnouncementsController(context, otherAdmin.Id).Delete(content.Announcement.Id));

        Assert.Equal(1, await context.FamilyEvents.CountAsync());
        Assert.Equal(1, await context.Kickbacks.CountAsync());
        Assert.Equal(1, await context.Polls.CountAsync());
        Assert.Equal(1, await context.Announcements.CountAsync());
        Assert.Single(await context.Notifications.ToListAsync());
    }

    private static async Task<SeededContent> SeedContent(AppDbContext context)
    {
        var group = new FamilyGroup { Id = Guid.NewGuid(), Name = "Family", CreatedAt = DateTime.UtcNow };
        context.FamilyGroups.Add(group);
        var admin = AddMember(context, group.Id, "admin@example.com", true);
        var member = AddMember(context, group.Id, "member@example.com", false);
        var familyEvent = new FamilyEvent
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            Title = "Dinner",
            StartDate = DateTime.UtcNow,
            CreatedByMemberId = member.Id,
            CreatedAt = DateTime.UtcNow
        };
        var kickback = new Kickback
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            CreatedByMemberId = member.Id,
            Vibe = "BBQ",
            ExpiresAtUtc = DateTime.UtcNow.AddHours(2),
            CreatedAtUtc = DateTime.UtcNow
        };
        var poll = new Poll
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            CreatedByMemberId = member.Id,
            Question = "Where to eat?",
            CreatedAt = DateTime.UtcNow
        };
        var option = new PollOption { Id = Guid.NewGuid(), PollId = poll.Id, Text = "Home" };
        var vote = new PollVote
        {
            Id = Guid.NewGuid(),
            PollOptionId = option.Id,
            MemberId = member.Id,
            CreatedAt = DateTime.UtcNow
        };
        var pollNotification = new Notification
        {
            Id = Guid.NewGuid(),
            MemberId = member.Id,
            Member = member,
            Message = "A poll was created.",
            Type = "PollCreated",
            Link = $"/poll/{poll.Id}",
            CreatedAt = DateTime.UtcNow
        };
        var announcement = new Announcement
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            CreatedByMemberId = member.Id,
            Title = "Welcome",
            Body = "Welcome!",
            CreatedAt = DateTime.UtcNow
        };

        context.FamilyEvents.Add(familyEvent);
        context.Kickbacks.Add(kickback);
        context.Polls.Add(poll);
        context.PollOptions.Add(option);
        context.PollVotes.Add(vote);
        context.Notifications.Add(pollNotification);
        context.Announcements.Add(announcement);
        context.ActivityFeed.AddRange(
            CreateActivity(group.Id, familyEvent.Id, "Event"),
            CreateActivity(group.Id, kickback.Id, "Kickback"),
            CreateActivity(group.Id, poll.Id, "Poll"),
            CreateActivity(group.Id, announcement.Id, "Announcement"));
        await context.SaveChangesAsync();

        return new SeededContent(admin, member, familyEvent, kickback, poll, announcement);
    }

    private static ActivityFeed CreateActivity(Guid groupId, Guid entityId, string entityType) => new()
    {
        Id = Guid.NewGuid(),
        FamilyGroupId = groupId,
        ActivityType = $"{entityType}Created",
        RelatedEntityId = entityId,
        RelatedEntityType = entityType,
        CreatedAtUtc = DateTime.UtcNow
    };

    private static GroupMember AddMember(AppDbContext context, Guid groupId, string email, bool isAdmin)
    {
        var user = new User { Id = Guid.NewGuid(), Email = email, DisplayName = email };
        var member = new GroupMember
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = groupId,
            UserId = user.Id,
            User = user,
            IsAdmin = isAdmin,
            JoinedAt = DateTime.UtcNow
        };
        context.Users.Add(user);
        context.GroupMembers.Add(member);
        return member;
    }

    private static EventsController CreateEventsController(AppDbContext context, Guid memberId) =>
        ConfigureController(new EventsController(context), memberId);

    private static KickbacksController CreateKickbacksController(AppDbContext context, Guid memberId) =>
        ConfigureController(new KickbacksController(context), memberId);

    private static PollsController CreatePollsController(AppDbContext context, Guid memberId) =>
        ConfigureController(new PollsController(context), memberId);

    private static AnnouncementsController CreateAnnouncementsController(AppDbContext context, Guid memberId) =>
        ConfigureController(new AnnouncementsController(context), memberId);

    private static T ConfigureController<T>(T controller, Guid memberId) where T : ControllerBase
    {
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    [new Claim("memberId", memberId.ToString())], "Test"))
            }
        };
        return controller;
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private sealed record SeededContent(
        GroupMember Admin,
        GroupMember Member,
        FamilyEvent Event,
        Kickback Kickback,
        Poll Poll,
        Announcement Announcement);
}
