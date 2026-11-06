using System.Security.Claims;
using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Models.Responses;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Tests;

public class KickbacksControllerTests
{
    [Fact]
    public async Task CreateStartsKickbackAtCurrentServerTime()
    {
        await using var context = CreateContext();
        var (group, member) = SeedMember(context);
        var beforeCreate = DateTime.UtcNow;

        var result = await CreateController(context, member.Id).Create(new CreateKickbackRequest
        {
            FamilyGroupId = group.Id,
            Vibe = "BBQ",
            ExpiresAtUtc = DateTime.UtcNow.AddHours(2)
        });

        var afterCreate = DateTime.UtcNow;
        Assert.IsType<CreatedAtActionResult>(result);
        var kickback = await context.Kickbacks.SingleAsync();
        Assert.InRange(kickback.CreatedAtUtc, beforeCreate, afterCreate);
        Assert.InRange(kickback.ExpiresAtUtc, beforeCreate.AddHours(2), afterCreate.AddHours(2));
    }

    [Fact]
    public async Task UpdateChangesExistingKickbackAndOnlyAllowsItsCreator()
    {
        await using var context = CreateContext();
        var (group, creator) = SeedMember(context);
        var otherMember = AddMember(context, group.Id, "other@example.com", "Other");
        var originalCreatedAt = DateTime.UtcNow.AddMinutes(-5);
        var kickback = new Kickback
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            CreatedByMemberId = creator.Id,
            Vibe = "BBQ",
            ExpiresAtUtc = DateTime.UtcNow.AddHours(1),
            CreatedAtUtc = originalCreatedAt,
            IsActive = true
        };
        context.Kickbacks.Add(kickback);
        await context.SaveChangesAsync();
        var newExpiry = DateTime.UtcNow.AddHours(4);

        var result = await CreateController(context, creator.Id).Update(kickback.Id, new UpdateKickbackRequest
        {
            Vibe = "Game On",
            Note = "Bring snacks",
            ExpiresAtUtc = newExpiry
        });

        var response = Assert.IsType<KickbackDto>(Assert.IsType<OkObjectResult>(result).Value);
        var updated = await context.Kickbacks.SingleAsync();
        Assert.Equal(kickback.Id, response.Id);
        Assert.Equal(kickback.Id, updated.Id);
        Assert.Equal("Game On", updated.Vibe);
        Assert.Equal("Bring snacks", updated.Note);
        Assert.Equal(originalCreatedAt, updated.CreatedAtUtc);
        Assert.Equal(newExpiry, updated.ExpiresAtUtc);

        var unauthorized = await CreateController(context, otherMember.Id).Update(
            kickback.Id,
            new UpdateKickbackRequest
            {
                Vibe = "Not allowed",
                ExpiresAtUtc = DateTime.UtcNow.AddHours(5)
            });

        Assert.IsType<ForbidResult>(unauthorized);
        Assert.Equal("Game On", (await context.Kickbacks.SingleAsync()).Vibe);
        Assert.Single(await context.Kickbacks.ToListAsync());
    }

    [Fact]
    public async Task DeleteRequiresGroupAdminAndRemovesRelatedData()
    {
        await using var context = CreateContext();
        var (group, creator) = SeedMember(context);
        var responder = AddMember(context, group.Id, "responder@example.com", "Responder");
        var otherGroup = new FamilyGroup { Id = Guid.NewGuid(), Name = "Other", CreatedAt = DateTime.UtcNow };
        context.FamilyGroups.Add(otherGroup);
        var otherAdmin = AddMember(context, otherGroup.Id, "admin@example.com", "Admin");
        otherAdmin.IsAdmin = true;
        var kickback = new Kickback
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            CreatedByMemberId = creator.Id,
            Vibe = "BBQ",
            ExpiresAtUtc = DateTime.UtcNow.AddHours(1),
            CreatedAtUtc = DateTime.UtcNow
        };
        context.Kickbacks.Add(kickback);
        context.KickbackResponses.Add(new KickbackResponse
        {
            Id = Guid.NewGuid(),
            KickbackId = kickback.Id,
            MemberId = responder.Id,
            ResponseType = "Maybe",
            CreatedAtUtc = DateTime.UtcNow
        });
        context.ActivityFeed.Add(new ActivityFeed
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            ActorMemberId = creator.Id,
            ActivityType = "KickbackCreated",
            RelatedEntityId = kickback.Id,
            RelatedEntityType = "Kickback",
            CreatedAtUtc = DateTime.UtcNow
        });
        context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            MemberId = responder.Id,
            Message = "Kickback",
            Link = $"/kickback/{kickback.Id}",
            CreatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        Assert.IsType<ForbidResult>(await CreateController(context, creator.Id).Delete(kickback.Id));
        Assert.IsType<ForbidResult>(await CreateController(context, otherAdmin.Id).Delete(kickback.Id));
        creator.IsAdmin = true;

        Assert.IsType<NoContentResult>(await CreateController(context, creator.Id).Delete(kickback.Id));
        Assert.Empty(await context.Kickbacks.ToListAsync());
        Assert.Empty(await context.KickbackResponses.ToListAsync());
        Assert.Empty(await context.ActivityFeed.ToListAsync());
        Assert.Empty(await context.Notifications.ToListAsync());
    }

    private static KickbacksController CreateController(AppDbContext context, Guid memberId)
    {
        return new KickbacksController(context)
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
        context.SaveChanges();
        return member;
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }
}
