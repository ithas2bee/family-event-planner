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
    public async Task CreateWithoutDurationLeavesAnnouncementWithoutExpiration()
    {
        await using var context = CreateContext();
        var (group, member) = SeedMember(context);
        var controller = CreateController(context, member.Id);

        var result = await controller.Create(new CreateAnnouncementRequest
        {
            FamilyGroupId = group.Id,
            Title = "Welcome",
            Body = "Welcome home."
        });

        Assert.IsType<CreatedAtActionResult>(result);
        Assert.Null((await context.Announcements.SingleAsync()).ExpiresAt);
    }

    [Fact]
    public async Task ExpiredAnnouncementsAreExcludedButNonExpiringAnnouncementsRemainVisible()
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
        Assert.Equal(["Active", "Permanent"], announcements.Select(a => a.Title));
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
