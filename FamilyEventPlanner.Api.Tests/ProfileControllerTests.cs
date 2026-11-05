using System.Security.Claims;
using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using System.Text.Json;
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

    [Fact]
    public async Task ProfileUpdateWithoutLegacyRolesPreservesExistingUserRoles()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "Test User");
        user.RolesJson = "[\"Mom\"]";
        await context.SaveChangesAsync();
        var controller = await CreateController(context, user.Id);

        await controller.Update(new UpdateProfileRequest { Name = "Updated User" });

        Assert.Equal("[\"Mom\"]", user.RolesJson);
    }

    [Fact]
    public async Task ProfileRoleAssignmentsAreMultipleAndScopedToEachCommunity()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "Test User");
        var family = AddGroup(context, "Doe Family");
        var friends = AddGroup(context, "Smith Friends");
        var familyMember = AddMember(context, user, family);
        var friendsMember = AddMember(context, user, friends);
        var mom = AddRole(context, family, "Mom", true);
        var organizer = AddRole(context, family, "Organizer", false);
        var friend = AddRole(context, friends, "Best Friend", true);
        await context.SaveChangesAsync();
        var controller = await CreateController(context, user.Id);

        var updated = await controller.Update(new UpdateProfileRequest
        {
            Name = "Test User",
            CommunityRoles =
            [
                new ProfileCommunityRolesUpdateRequest { GroupId = family.Id, RoleIds = [mom.Id, organizer.Id] },
                new ProfileCommunityRolesUpdateRequest { GroupId = friends.Id, RoleIds = [friend.Id] }
            ]
        });

        var profile = Assert.IsType<ProfileResponse>(Assert.IsType<OkObjectResult>(updated.Result).Value);
        Assert.Equal(new[] { "Mom", "Organizer" }, Assert.Single(profile.Communities, item => item.GroupId == family.Id).Roles);
        Assert.Equal(new[] { "Best Friend" }, Assert.Single(profile.Communities, item => item.GroupId == friends.Id).Roles);
        Assert.Equal(3, await context.CommunityRoleAssignments.CountAsync());

        var savedAgain = await controller.Update(new UpdateProfileRequest
        {
            Name = "Test User",
            CommunityRoles =
            [
                new ProfileCommunityRolesUpdateRequest { GroupId = family.Id, RoleIds = [mom.Id, organizer.Id] },
                new ProfileCommunityRolesUpdateRequest { GroupId = friends.Id, RoleIds = [friend.Id] }
            ]
        });
        Assert.IsType<OkObjectResult>(savedAgain.Result);
        Assert.Equal(3, await context.CommunityRoleAssignments.CountAsync());

        await controller.Update(new UpdateProfileRequest
        {
            Name = "Test User",
            CommunityRoles =
            [
                new ProfileCommunityRolesUpdateRequest { GroupId = family.Id, RoleIds = [mom.Id] },
                new ProfileCommunityRolesUpdateRequest { GroupId = friends.Id, RoleIds = [] }
            ]
        });
        var profileAfterDeselect = await controller.Get();
        var deselectedProfile = Assert.IsType<ProfileResponse>(Assert.IsType<OkObjectResult>(profileAfterDeselect.Result).Value);
        Assert.Equal(new[] { "Mom" }, Assert.Single(deselectedProfile.Communities, item => item.GroupId == family.Id).Roles);
        Assert.Empty(Assert.Single(deselectedProfile.Communities, item => item.GroupId == friends.Id).Roles);
        Assert.Equal(1, await context.CommunityRoleAssignments.CountAsync());
        Assert.False(familyMember.IsAdmin);
        Assert.False(friendsMember.IsAdmin);
    }

    [Fact]
    public async Task ProfileRoleUpdateRejectsRolesAndCommunitiesOutsideMembership()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "Test User");
        var memberGroup = AddGroup(context, "Member Group");
        var otherGroup = AddGroup(context, "Other Group");
        AddMember(context, user, memberGroup);
        var otherRole = AddRole(context, otherGroup, "Other role", false);
        await context.SaveChangesAsync();
        var controller = await CreateController(context, user.Id);

        var crossCommunityRole = await controller.Update(new UpdateProfileRequest
        {
            CommunityRoles = [new ProfileCommunityRolesUpdateRequest
            {
                GroupId = memberGroup.Id,
                RoleIds = [otherRole.Id]
            }]
        });
        var nonMemberGroup = await controller.Update(new UpdateProfileRequest
        {
            CommunityRoles = [new ProfileCommunityRolesUpdateRequest
            {
                GroupId = otherGroup.Id,
                RoleIds = []
            }]
        });

        Assert.IsType<BadRequestObjectResult>(crossCommunityRole.Result);
        Assert.IsType<BadRequestObjectResult>(nonMemberGroup.Result);
        Assert.Empty(await context.CommunityRoleAssignments.ToListAsync());
    }

    [Fact]
    public async Task CommunityMemberCanViewOnlyTargetProfilesAndCommunitiesTheyShare()
    {
        await using var context = CreateContext();
        var caller = AddUser(context, "Caller");
        var target = AddUser(context, "Target");
        target.Age = 40;
        target.Location = "Seattle";
        target.Bio = "Hello";
        target.Email = "private@example.com";
        var shared = AddGroup(context, "Shared");
        var privateGroup = AddGroup(context, "Not Shared");
        AddMember(context, caller, shared);
        var targetSharedMembership = AddMember(context, target, shared);
        var targetPrivateMembership = AddMember(context, target, privateGroup);
        var sharedRole = AddRole(context, shared, "Friend", true);
        var privateRole = AddRole(context, privateGroup, "Organizer", false);
        context.CommunityRoleAssignments.AddRange(
            new CommunityRoleAssignment
            {
                FamilyGroupId = shared.Id,
                GroupMemberId = targetSharedMembership.Id,
                CommunityRoleId = sharedRole.Id
            },
            new CommunityRoleAssignment
            {
                FamilyGroupId = privateGroup.Id,
                GroupMemberId = targetPrivateMembership.Id,
                CommunityRoleId = privateRole.Id
            });
        await context.SaveChangesAsync();
        var controller = await CreateController(context, caller.Id);

        var response = await controller.GetCommunityMember(shared.Id, targetSharedMembership.Id);

        var profile = Assert.IsType<MemberProfileResponse>(Assert.IsType<OkObjectResult>(response.Result).Value);
        Assert.Equal("Target", profile.Name);
        Assert.False(profile.IsOwnProfile);
        Assert.Equal(40, profile.Age);
        Assert.Equal("Seattle", profile.Location);
        Assert.Equal("Hello", profile.Bio);
        Assert.Equal("Shared", Assert.Single(profile.Communities).CommunityName);
        Assert.Equal(new[] { "Friend" }, Assert.Single(profile.Communities).Roles);
        Assert.DoesNotContain("private@example.com", JsonSerializer.Serialize(profile));
        var forbidden = await controller.GetCommunityMember(privateGroup.Id, targetPrivateMembership.Id);
        Assert.IsType<ForbidResult>(forbidden.Result);
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

    private static FamilyGroup AddGroup(AppDbContext context, string name)
    {
        var group = new FamilyGroup { Id = Guid.NewGuid(), Name = name, CreatedAt = DateTime.UtcNow };
        context.FamilyGroups.Add(group);
        return group;
    }

    private static GroupMember AddMember(AppDbContext context, User user, FamilyGroup group)
    {
        var member = new GroupMember
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            User = user,
            FamilyGroupId = group.Id,
            FamilyGroup = group,
            JoinedAt = DateTime.UtcNow
        };
        context.GroupMembers.Add(member);
        return member;
    }

    private static CommunityRole AddRole(AppDbContext context, FamilyGroup group, string name, bool isDefault)
    {
        var role = new CommunityRole
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            FamilyGroup = group,
            Name = name,
            IsDefault = isDefault,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.CommunityRoles.Add(role);
        return role;
    }
}
