using System.Security.Claims;
using System.Reflection;
using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace FamilyEventPlanner.Api.Tests;

public class CommunityRolesControllerTests
{
    [Theory]
    [InlineData("Family", "Mom|Dad|Child|Grandparent")]
    [InlineData("Friends", "Friend|Best Friend|Host|Guest")]
    [InlineData("Couples", "Partner 1|Partner 2|Couple Friend|Guest")]
    [InlineData("Parents & Kids", "Parent|Child|Guardian|Caregiver")]
    [InlineData("Sports & Fitness", "Coach|Player|Trainer|Team Manager")]
    [InlineData("School & Education", "Student|Teacher|Parent|Staff")]
    [InlineData("Work & Professional", "Employee|Manager|Team Lead|Consultant")]
    [InlineData("Neighborhood & Local", "Resident|Neighbor|Community Leader|Volunteer")]
    [InlineData("Hobbies & Interests", "Enthusiast|Beginner|Expert|Instructor")]
    [InlineData("Faith & Spiritual", "Faith Leader|Member|Volunteer|Ministry Leader")]
    [InlineData("Clubs & Organizations", "President|Officer|Member|Volunteer")]
    [InlineData("Travel", "Trip Organizer|Traveler|Travel Companion|Guest")]
    [InlineData("Alumni", "Graduate|Current Student|Faculty|Alumni Organizer")]
    [InlineData("Support & Care", "Caregiver|Recipient|Support Volunteer|Coordinator")]
    [InlineData("Events & Social", "Event Organizer|Host|Participant|Volunteer")]
    [InlineData("Other", "Member|Organizer|Coordinator|Guest")]
    public void DefaultsMatchCommunityType(string groupType, string expectedRoles)
    {
        var roles = CommunityRoleDefaults.ForGroupType(groupType);

        Assert.Equal(expectedRoles.Split('|'), roles);
        Assert.Equal(4, roles.Count);
    }

    [Fact]
    public void CommunityRoleManagementRequiresAuthenticatedAccountIdentity()
    {
        var authorization = Assert.Single(typeof(CommunityRolesController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true).Cast<AuthorizeAttribute>());

        Assert.Equal(JwtBearerDefaults.AuthenticationScheme, authorization.AuthenticationSchemes);

        var assignmentAuthorization = Assert.Single(typeof(GroupMembersController)
            .GetMethod(nameof(GroupMembersController.UpdateMemberRole))!
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true).Cast<AuthorizeAttribute>());
        Assert.Equal(JwtBearerDefaults.AuthenticationScheme, assignmentAuthorization.AuthenticationSchemes);
    }

    [Fact]
    public async Task AdminCanManageOnlyTheirCommunitiesRolesAndRestoreDefaults()
    {
        await using var context = CreateContext();
        var group = AddGroup(context, "Alumni");
        var otherGroup = AddGroup(context, "Family");
        var admin = AddMember(context, group, true);
        var otherAdmin = AddMember(context, otherGroup, true);
        var controller = CreateController(context, admin.UserId);
        await context.SaveChangesAsync();

        var created = Assert.IsType<CreatedAtActionResult>(
            await controller.Create(group.Id, new CommunityRoleRequest { Name = "Mentor" }));
        var role = Assert.IsType<CommunityRole>(created.Value);
        Assert.False(role.IsDefault);
        Assert.Contains(await context.CommunityRoles.ToListAsync(), item =>
            item.FamilyGroupId == group.Id && item.Name == "Mentor");
        Assert.DoesNotContain(await context.CommunityRoles.ToListAsync(), item =>
            item.FamilyGroupId == otherGroup.Id && item.Name == "Mentor");

        var updated = Assert.IsType<OkObjectResult>(
            await controller.Update(group.Id, role.Id, new CommunityRoleRequest { Name = "Advisor" }));
        Assert.Equal("Advisor", Assert.IsType<CommunityRole>(updated.Value).Name);
        Assert.IsType<ConflictObjectResult>(
            await controller.Create(group.Id, new CommunityRoleRequest { Name = " advisor " }));

        Assert.IsType<NoContentResult>(await controller.Deactivate(group.Id, role.Id));
        Assert.IsType<ForbidResult>(await controller.Update(otherGroup.Id, role.Id, new CommunityRoleRequest { Name = "Changed" }));
        Assert.IsType<ForbidResult>(await controller.Create(otherGroup.Id, new CommunityRoleRequest { Name = "Unauthorized" }));

        var restored = Assert.IsType<OkObjectResult>(await controller.RestoreDefaults(group.Id));
        var activeRoles = Assert.IsType<List<CommunityRole>>(restored.Value);
        Assert.Contains(activeRoles, item => item.Name == "Graduate" && item.IsDefault);
        Assert.DoesNotContain(activeRoles, item => item.Name == "Advisor");
        Assert.True(await context.GroupMembers.AnyAsync(member => member.Id == otherAdmin.Id));
    }

    [Fact]
    public async Task OrdinaryMemberCanListButCannotManageCommunityRoles()
    {
        await using var context = CreateContext();
        var group = AddGroup(context, "Family");
        var member = AddMember(context, group, false);
        await context.SaveChangesAsync();
        var controller = CreateController(context, member.UserId);

        Assert.IsType<OkObjectResult>(await controller.Get(group.Id));
        Assert.IsType<ForbidResult>(await controller.Create(group.Id, new CommunityRoleRequest { Name = "Guest" }));
        Assert.IsType<ForbidResult>(await controller.RestoreDefaults(group.Id));
    }

    [Fact]
    public async Task RestoreDefaultsDoesNotReactivateADefaultWhenAnActiveRoleAlreadyUsesItsName()
    {
        await using var context = CreateContext();
        var group = AddGroup(context, "Alumni");
        var admin = AddMember(context, group, true);
        context.CommunityRoles.AddRange(
            CreateRole(group, "Graduate", isDefault: true, isActive: false),
            CreateRole(group, "Graduate", isDefault: false, isActive: true));
        await context.SaveChangesAsync();
        var controller = CreateController(context, admin.UserId);

        var result = Assert.IsType<OkObjectResult>(await controller.RestoreDefaults(group.Id));
        var activeRoles = Assert.IsType<List<CommunityRole>>(result.Value);

        Assert.Single(activeRoles.Where(role => role.Name == "Graduate"));
        Assert.Contains(activeRoles, role => role.Name == "Graduate" && role.IsDefault);
    }

    [Fact]
    public async Task RestoreDefaultsIsIdempotentForExistingCommunities()
    {
        await using var context = CreateContext();
        var group = AddGroup(context, "Friends");
        var admin = AddMember(context, group, true);
        await context.SaveChangesAsync();
        var controller = CreateController(context, admin.UserId);

        await controller.RestoreDefaults(group.Id);
        await controller.RestoreDefaults(group.Id);

        var roles = await context.CommunityRoles.Where(role => role.FamilyGroupId == group.Id && role.IsActive).ToListAsync();
        Assert.Equal(4, roles.Count);
        Assert.All(roles, role => Assert.True(role.IsDefault));
    }

    [Fact]
    public async Task DefaultsCannotBeChangedOrRemovedAndCustomRoleRulesAreEnforced()
    {
        await using var context = CreateContext();
        var group = AddGroup(context, "Family");
        var admin = AddMember(context, group, true);
        var defaultRole = CreateRole(group, "Mom", isDefault: true, isActive: true);
        context.CommunityRoles.Add(defaultRole);
        await context.SaveChangesAsync();
        var controller = CreateController(context, admin.UserId);

        Assert.IsType<BadRequestObjectResult>(
            await controller.Update(group.Id, defaultRole.Id, new CommunityRoleRequest { Name = "Parent" }));
        Assert.IsType<BadRequestObjectResult>(await controller.Deactivate(group.Id, defaultRole.Id));
        Assert.IsType<BadRequestObjectResult>(
            await controller.Create(group.Id, new CommunityRoleRequest { Name = "   " }));
        Assert.IsType<ConflictObjectResult>(
            await controller.Create(group.Id, new CommunityRoleRequest { Name = " mOm " }));

        for (var index = 0; index < 4; index++)
        {
            Assert.IsType<CreatedAtActionResult>(
                await controller.Create(group.Id, new CommunityRoleRequest { Name = $"Custom {index}" }));
        }

        Assert.IsType<ConflictObjectResult>(
            await controller.Create(group.Id, new CommunityRoleRequest { Name = "Fifth custom" }));
    }

    [Fact]
    public async Task ConcurrentCreationCannotExceedFourCustomRoles()
    {
        var databaseName = Guid.NewGuid().ToString();
        var root = new InMemoryDatabaseRoot();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName, root)
            .Options;
        Guid groupId;
        Guid userId;
        await using (var setup = new AppDbContext(options))
        {
            var group = AddGroup(setup, "Other");
            var admin = AddMember(setup, group, true);
            groupId = group.Id;
            userId = admin.UserId;
            await setup.SaveChangesAsync();
        }

        var results = await Task.WhenAll(Enumerable.Range(0, 8).Select(async index =>
        {
            await using var context = new AppDbContext(options);
            return await CreateController(context, userId).Create(
                groupId, new CommunityRoleRequest { Name = $"Role {index}" });
        }));

        Assert.Equal(4, results.Count(result => result is CreatedAtActionResult));
        Assert.Equal(4, results.Count(result => result is ConflictObjectResult));
        await using var verify = new AppDbContext(options);
        Assert.Equal(4, await verify.CommunityRoles.CountAsync(role =>
            role.FamilyGroupId == groupId && role.IsActive && !role.IsDefault));
    }

    [Fact]
    public async Task RemovingCustomRoleClearsItsMemberAssignments()
    {
        await using var context = CreateContext();
        var group = AddGroup(context, "Family");
        var admin = AddMember(context, group, true);
        var role = CreateRole(group, "Organizer", isDefault: false, isActive: true);
        var member = AddMember(context, group, false);
        member.CommunityRoleId = role.Id;
        context.CommunityRoles.Add(role);
        context.CommunityRoleAssignments.Add(new CommunityRoleAssignment
        {
            FamilyGroupId = group.Id,
            GroupMemberId = member.Id,
            CommunityRoleId = role.Id
        });
        await context.SaveChangesAsync();
        var controller = CreateController(context, admin.UserId);

        Assert.IsType<NoContentResult>(await controller.Deactivate(group.Id, role.Id));
        Assert.Null(member.CommunityRoleId);
        Assert.Empty(await context.CommunityRoleAssignments.ToListAsync());
    }

    [Fact]
    public async Task DescriptiveRoleNamesNeverGrantSystemAdministratorPermissions()
    {
        await using var context = CreateContext();
        var group = AddGroup(context, "Other");
        var admin = AddMember(context, group, true);
        var member = AddMember(context, group, false);
        var role = CreateRole(group, "Admin", isDefault: false, isActive: true);
        context.CommunityRoles.Add(role);
        await context.SaveChangesAsync();

        var assignmentController = new GroupMembersController(context);
        assignmentController.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity([
                    new Claim(ClaimTypes.NameIdentifier, admin.UserId.ToString())
                ], "test"))
            }
        };
        var assignment = await assignmentController.UpdateMemberRole(
            group.Id, member.Id, new UpdateGroupMemberRoleRequest { RoleId = role.Id });

        Assert.IsType<OkObjectResult>(assignment);
        Assert.False(member.IsAdmin);
        Assert.IsType<ForbidResult>(await CreateController(context, member.UserId).Create(
            group.Id, new CommunityRoleRequest { Name = "Another role" }));
        Assert.True(admin.IsAdmin);
    }

    private static AppDbContext CreateContext() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .Options);

    private static FamilyGroup AddGroup(AppDbContext context, string groupType)
    {
        var group = new FamilyGroup
        {
            Id = Guid.NewGuid(),
            Name = "Group",
            GroupType = groupType,
            CreatedAt = DateTime.UtcNow
        };
        context.FamilyGroups.Add(group);
        return group;
    }

    private static GroupMember AddMember(AppDbContext context, FamilyGroup group, bool isAdmin)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = $"{Guid.NewGuid()}@example.com",
            CreatedAt = DateTime.UtcNow
        };
        var member = new GroupMember
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            FamilyGroup = group,
            UserId = user.Id,
            User = user,
            IsAdmin = isAdmin,
            JoinedAt = DateTime.UtcNow
        };
        context.Users.Add(user);
        context.GroupMembers.Add(member);
        return member;
    }

    private static CommunityRole CreateRole(
        FamilyGroup group,
        string name,
        bool isDefault,
        bool isActive)
    {
        return new CommunityRole
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            FamilyGroup = group,
            Name = name,
            IsDefault = isDefault,
            IsActive = isActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static CommunityRolesController CreateController(AppDbContext context, Guid userId)
    {
        var controller = new CommunityRolesController(context);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity([
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString())
                ], "test"))
            }
        };
        return controller;
    }
}
