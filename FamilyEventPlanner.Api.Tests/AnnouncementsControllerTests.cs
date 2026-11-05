using System.Security.Claims;
using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Models.Responses;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Tests;

public class AnnouncementsControllerTests
{
    [Fact]
    public async Task CreateWithDurationPersistsExpirationAndReturnsIt()
    {
        await using var context = CreateContext();
        var (group, member) = SeedMember(context);
        var controller = CreateController(context, member.Id);

        var result = await controller.Create(new CreateAnnouncementRequest
        {
            FamilyGroupId = group.Id,
            Title = "Dinner",
            Body = "Dinner is ready.",
            DurationHours = 24
        });

        var created = Assert.IsType<CreatedAtActionResult>(result);
        var response = Assert.IsType<AnnouncementResponse>(created.Value);
        var announcement = await context.Announcements.SingleAsync();

        Assert.NotNull(announcement.ExpiresAt);
        Assert.InRange(announcement.ExpiresAt!.Value, DateTime.UtcNow.AddHours(23.9), DateTime.UtcNow.AddHours(24.1));
        Assert.Equal(announcement.ExpiresAt, response.ExpiresAt);
    }

    [Fact]
    public async Task CreateWithoutDurationDefaultsToFourteenDays()
    {
        await using var context = CreateContext();
        var (group, member) = SeedMember(context);
        var controller = CreateController(context, member.Id);
        var beforeCreate = DateTime.UtcNow;

        var result = await controller.Create(new CreateAnnouncementRequest
        {
            FamilyGroupId = group.Id,
            Title = "Welcome",
            Body = "Welcome home."
        });

        Assert.IsType<CreatedAtActionResult>(result);
        Assert.InRange(
            (await context.Announcements.SingleAsync()).ExpiresAt!.Value,
            beforeCreate.AddDays(14),
            DateTime.UtcNow.AddDays(14));
    }

    [Fact]
    public async Task CreateRejectsExpirationBeyondFourteenDays()
    {
        await using var context = CreateContext();
        var (group, member) = SeedMember(context);

        var result = await CreateController(context, member.Id).Create(new CreateAnnouncementRequest
        {
            FamilyGroupId = group.Id,
            Title = "Too long",
            Body = "This should not be stored.",
            ExpiresAt = DateTime.UtcNow.AddDays(15)
        });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Empty(await context.Announcements.ToListAsync());
    }

    [Fact]
    public async Task ExpiredAndNullExpirationAnnouncementsAreExcluded()
    {
        await using var context = CreateContext();
        var (group, member) = SeedMember(context);
        context.Announcements.AddRange(
            new Announcement
            {
                Id = Guid.NewGuid(),
                FamilyGroupId = group.Id,
                CreatedByMemberId = member.Id,
                Title = "Active",
                Body = "Still current.",
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddHours(1)
            },
            new Announcement
            {
                Id = Guid.NewGuid(),
                FamilyGroupId = group.Id,
                CreatedByMemberId = member.Id,
                Title = "Expired",
                Body = "No longer current.",
                CreatedAt = DateTime.UtcNow.AddMinutes(-1),
                ExpiresAt = DateTime.UtcNow.AddHours(-1)
            },
            new Announcement
            {
                Id = Guid.NewGuid(),
                FamilyGroupId = group.Id,
                CreatedByMemberId = member.Id,
                Title = "Permanent",
                Body = "Always current.",
                CreatedAt = DateTime.UtcNow.AddMinutes(-2)
            });
        await context.SaveChangesAsync();

        var result = await CreateController(context, member.Id).GetForGroup(group.Id);

        var announcements = Assert.IsType<OkObjectResult>(result).Value as List<AnnouncementResponse>;
        Assert.NotNull(announcements);
        Assert.Equal(["Active"], announcements.Select(a => a.Title));
        Assert.IsType<NotFoundObjectResult>(await CreateController(context, member.Id).GetById(
            (await context.Announcements.SingleAsync(a => a.Title == "Expired")).Id));
    }

    [Fact]
    public async Task ExpirationWarningAllowsOneFortyEightHourExtensionForCreator()
    {
        await using var context = CreateContext();
        var (group, creator) = SeedMember(context);
        var announcement = new Announcement
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            CreatedByMemberId = creator.Id,
            Title = "Dinner",
            Body = "Dinner is ready.",
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(12),
            ExpirationNotificationSent = true
        };
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            MemberId = creator.Id,
            Message = "Announcement is expiring.",
            Type = "AnnouncementExpiring",
            Link = $"/announcement/{announcement.Id}",
            CreatedAt = DateTime.UtcNow
        };
        context.Announcements.Add(announcement);
        context.Notifications.Add(notification);
        await context.SaveChangesAsync();
        var originalExpiration = announcement.ExpiresAt;
        var controller = CreateController(context, creator.Id);

        var result = await controller.ExtendExpiration(announcement.Id);
        var repeatedResult = await controller.ExtendExpiration(announcement.Id);

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal(originalExpiration!.Value.AddHours(48), announcement.ExpiresAt);
        Assert.True(announcement.ExpirationExtended);
        Assert.IsType<ConflictObjectResult>(repeatedResult);
        Assert.Equal("AnnouncementExpirationExtended", notification.Type);
    }

    private static AnnouncementsController CreateController(AppDbContext context, Guid memberId)
    {
        return new AnnouncementsController(context)
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

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }
}
