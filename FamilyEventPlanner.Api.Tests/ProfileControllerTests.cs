using System.Security.Claims;
using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Tests;

public class ProfileControllerTests
{
    [Fact]
    public async Task GetReturnsOnlyTheAuthenticatedUsersProfileAndDerivedFamily()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "Current User");
        var other = AddUser(context, "Other User");
        var family = new FamilyGroup { Id = Guid.NewGuid(), Name = "Current Family", InviteCode = "current", CreatedAt = DateTime.UtcNow };
        context.FamilyGroups.Add(family);
        context.GroupMembers.Add(new GroupMember { Id = Guid.NewGuid(), UserId = user.Id, User = user, FamilyGroupId = family.Id, FamilyGroup = family, JoinedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        var controller = await CreateController(context, user.Id);
        var result = await controller.Get();

        var response = Assert.IsType<OkObjectResult>(result.Result);
        var profile = Assert.IsType<ProfileResponse>(response.Value);
        Assert.Equal("Current User", profile.Name);
        Assert.Equal(new[] { "Current Family" }, profile.FamilyNames);
        Assert.NotEqual("Other User", profile.Name);
    }

    [Fact]
    public async Task UpdatePersistsMultipleRolesAndSupportsRemovingOne()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "Test User");
        await context.SaveChangesAsync();
        var controller = await CreateController(context, user.Id);

        var first = await controller.Update(new UpdateProfileRequest
        {
            Name = "Updated User",
            Age = 34,
            Location = "Austin, TX",
            Bio = "Family first.",
            Roles = ["Mom", "Aunt", "Cousin"]
        });

        var firstProfile = Assert.IsType<ProfileResponse>(Assert.IsType<OkObjectResult>(first.Result).Value);
        Assert.Equal(new[] { "Mom", "Aunt", "Cousin" }, firstProfile.Roles);

        var second = await controller.Update(new UpdateProfileRequest
        {
            Name = "Updated User",
            Age = 34,
            Location = "Austin, TX",
            Bio = "Family first.",
            Roles = ["Mom", "Cousin"]
        });
        var secondProfile = Assert.IsType<ProfileResponse>(Assert.IsType<OkObjectResult>(second.Result).Value);
        Assert.Equal(new[] { "Mom", "Cousin" }, secondProfile.Roles);
        Assert.Equal("Updated User", (await context.Users.FindAsync(user.Id))!.DisplayName);
    }

    private static async Task<ProfileController> CreateController(AppDbContext context, Guid userId)
    {
        var controller = new ProfileController(context);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity([
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString())
                ], "Test"))
            }
        };
        await Task.CompletedTask;
        return controller;
    }

    private static AppDbContext CreateContext() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .Options);

    private static User AddUser(AppDbContext context, string name)
    {
        var user = new User { Id = Guid.NewGuid(), Email = $"{Guid.NewGuid()}@example.com", DisplayName = name, CreatedAt = DateTime.UtcNow };
        context.Users.Add(user);
        return user;
    }
}
