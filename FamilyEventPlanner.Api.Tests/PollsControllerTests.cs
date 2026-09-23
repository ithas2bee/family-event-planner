using System.Security.Claims;
using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Models.Responses;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Tests;

public class PollsControllerTests
{
    [Fact]
    public async Task CreateWithDurationPersistsExpirationAndReturnsIt()
    {
        await using var context = CreateContext();
        var (group, member) = SeedMember(context);
        var controller = CreateController(context, member.Id);

        var result = await controller.Create(new CreatePollRequest
        {
            FamilyGroupId = group.Id,
            Question = "Where should we eat?",
            Options = ["Home", "Restaurant"],
            DurationHours = 24
        });

        var created = Assert.IsType<CreatedAtActionResult>(result);
        var response = Assert.IsType<PollResponse>(created.Value);
        var poll = await context.Polls.SingleAsync();

        Assert.NotNull(poll.ExpiresAt);
        Assert.InRange(poll.ExpiresAt!.Value, DateTime.UtcNow.AddHours(23.9), DateTime.UtcNow.AddHours(24.1));
        Assert.Equal(poll.ExpiresAt, response.ExpiresAt);
    }

    [Fact]
    public async Task CreateWithNotifyFamilyNotifiesOtherMembersInTheGroup()
    {
        await using var context = CreateContext();
        var (group, creator) = SeedMember(context);
        var otherMember = AddMember(context, group.Id, "other@example.com", "Other");
        var unrelatedGroup = new FamilyGroup { Id = Guid.NewGuid(), Name = "Other Family", CreatedAt = DateTime.UtcNow };
        context.FamilyGroups.Add(unrelatedGroup);
        var unrelatedMember = AddMember(context, unrelatedGroup.Id, "unrelated@example.com", "Unrelated");
        await context.SaveChangesAsync();

        var result = await CreateController(context, creator.Id).Create(new CreatePollRequest
        {
            FamilyGroupId = group.Id,
            Question = "Where should we eat?",
            Options = ["Home", "Restaurant"],
            NotifyFamily = true
        });

        Assert.IsType<CreatedAtActionResult>(result);
        var notifications = await context.Notifications.ToListAsync();
        var notification = Assert.Single(notifications);
        Assert.Equal(otherMember.Id, notification.MemberId);
        Assert.DoesNotContain(notifications, n => n.MemberId == creator.Id || n.MemberId == unrelatedMember.Id);
        Assert.Equal("PollCreated", notification.Type);
        Assert.Contains("Where should we eat?", notification.Message);
        Assert.StartsWith("/poll/", notification.Link);
        Assert.Single(await context.ActivityFeed.ToListAsync());
    }

    [Fact]
    public async Task CreateWithoutNotifyFamilyDoesNotCreateNotifications()
    {
        await using var context = CreateContext();
        var (group, creator) = SeedMember(context);
        AddMember(context, group.Id, "other@example.com", "Other");
        await context.SaveChangesAsync();

        var result = await CreateController(context, creator.Id).Create(new CreatePollRequest
        {
            FamilyGroupId = group.Id,
            Question = "Choose",
            Options = ["One", "Two"],
            DurationHours = 24,
            NotifyFamily = false
        });

        Assert.IsType<CreatedAtActionResult>(result);
        Assert.Empty(await context.Notifications.ToListAsync());
        Assert.Empty(await context.ActivityFeed.ToListAsync());
        Assert.NotNull((await context.Polls.SingleAsync()).ExpiresAt);
    }

    [Fact]
    public async Task VoteOnExpiredPollIsRejectedButActivePollAcceptsVote()
    {
        await using var context = CreateContext();
        var (group, member) = SeedMember(context);
        var activePoll = AddPoll(context, group.Id, member.Id, DateTime.UtcNow.AddHours(1));
        var expiredPoll = AddPoll(context, group.Id, member.Id, DateTime.UtcNow.AddHours(-1));
        await context.SaveChangesAsync();
        var controller = CreateController(context, member.Id);

        var activeResult = await controller.Vote(new VoteRequest { PollOptionId = activePoll.Options[0].Id });
        var expiredResult = await controller.Vote(new VoteRequest { PollOptionId = expiredPoll.Options[0].Id });

        Assert.IsType<OkObjectResult>(activeResult);
        var expiredBadRequest = Assert.IsType<BadRequestObjectResult>(expiredResult);
        Assert.Contains("expired", expiredBadRequest.Value!.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ExistingPollWithoutExpirationRemainsActive()
    {
        await using var context = CreateContext();
        var (group, member) = SeedMember(context);
        var poll = AddPoll(context, group.Id, member.Id, null);
        await context.SaveChangesAsync();
        var controller = CreateController(context, member.Id);

        var result = await controller.Vote(new VoteRequest { PollOptionId = poll.Options[0].Id });

        Assert.IsType<OkObjectResult>(result);
    }

    private static PollsController CreateController(AppDbContext context, Guid memberId)
    {
        var controller = new PollsController(context)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        [new Claim("memberId", memberId.ToString())], "Test"))
                }
            }
        };
        return controller;
    }

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

    private static GroupMember AddMember(AppDbContext context, Guid groupId, string email, string displayName)
    {
        var user = new User { Id = Guid.NewGuid(), Email = email, DisplayName = displayName };
        var member = new GroupMember
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = groupId,
            UserId = user.Id,
            User = user,
            JoinedAt = DateTime.UtcNow
        };
        context.Users.Add(user);
        context.GroupMembers.Add(member);
        return member;
    }

    private static Poll AddPoll(AppDbContext context, Guid groupId, Guid memberId, DateTime? expiresAt)
    {
        var poll = new Poll
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = groupId,
            CreatedByMemberId = memberId,
            Question = "Choose",
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = expiresAt,
            Options =
            [
                new PollOption { Id = Guid.NewGuid(), Text = "One" },
                new PollOption { Id = Guid.NewGuid(), Text = "Two" }
            ]
        };
        context.Polls.Add(poll);
        return poll;
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }
}
