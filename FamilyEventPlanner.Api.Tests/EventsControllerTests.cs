using System.Security.Claims;
using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Tests;

public class EventsControllerTests
{
    [Fact]
    public async Task DeleteRequiresGroupAdminAndRemovesRelatedData()
    {
        await using var context = CreateContext();
        var group = new FamilyGroup { Id = Guid.NewGuid(), Name = "Family", CreatedAt = DateTime.UtcNow };
        var creator = AddMember(context, group.Id, "creator@example.com", "Creator");
        var attendee = AddMember(context, group.Id, "attendee@example.com", "Attendee");
        var otherGroup = new FamilyGroup { Id = Guid.NewGuid(), Name = "Other", CreatedAt = DateTime.UtcNow };
        var otherAdmin = AddMember(context, otherGroup.Id, "admin@example.com", "Admin");
        otherAdmin.IsAdmin = true;
        var familyEvent = new FamilyEvent
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            Title = "Dinner",
            StartDate = DateTime.UtcNow,
            CreatedByMemberId = creator.Id
        };
        var assignment = new EventAssignment
        {
            Id = Guid.NewGuid(),
            FamilyEventId = familyEvent.Id,
            Title = "Bring food",
            AssignedToId = attendee.Id
        };
        var poll = new Poll
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            FamilyEventId = familyEvent.Id,
            Question = "What to eat?",
            CreatedAt = DateTime.UtcNow,
            Options = [new PollOption { Id = Guid.NewGuid(), Text = "Pizza" }]
        };
        context.FamilyGroups.AddRange(group, otherGroup);
        context.Users.AddRange(creator.User, attendee.User, otherAdmin.User);
        context.GroupMembers.AddRange(creator, attendee, otherAdmin);
        context.FamilyEvents.Add(familyEvent);
        context.EventAssignments.Add(assignment);
        context.EventAttendances.Add(new EventAttendance
        {
            Id = Guid.NewGuid(),
            FamilyEventId = familyEvent.Id,
            MemberId = attendee.Id
        });
        context.Polls.Add(poll);
        context.ActivityFeed.Add(new ActivityFeed
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            ActorMemberId = creator.Id,
            ActivityType = "EventCreated",
            RelatedEntityId = familyEvent.Id,
            RelatedEntityType = "Event",
            CreatedAtUtc = DateTime.UtcNow
        });
        context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            MemberId = attendee.Id,
            Message = "Event",
            Link = $"/event/{familyEvent.Id}",
            CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        Assert.IsType<ForbidResult>(await CreateController(context, creator.Id).DeleteEvent(familyEvent.Id));
        Assert.IsType<ForbidResult>(await CreateController(context, otherAdmin.Id).DeleteEvent(familyEvent.Id));
        creator.IsAdmin = true;

        Assert.IsType<NoContentResult>(await CreateController(context, creator.Id).DeleteEvent(familyEvent.Id));
        Assert.Empty(await context.FamilyEvents.ToListAsync());
        Assert.Empty(await context.EventAssignments.ToListAsync());
        Assert.Empty(await context.EventAttendances.ToListAsync());
        Assert.Empty(await context.ActivityFeed.ToListAsync());
        Assert.Empty(await context.Notifications.ToListAsync());
        Assert.Null((await context.Polls.SingleAsync()).FamilyEventId);
    }

    private static GroupMember AddMember(AppDbContext context, Guid groupId, string email, string displayName)
    {
        var user = new User { Id = Guid.NewGuid(), Email = email, DisplayName = displayName };
        return new GroupMember
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = groupId,
            UserId = user.Id,
            User = user,
            JoinedAt = DateTime.UtcNow
        };
    }

    private static EventsController CreateController(AppDbContext context, Guid memberId) =>
        new(context)
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

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }
}
