using System.Security.Claims;
using System.Reflection;
using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace FamilyEventPlanner.Api.Tests;

public class CommunityRolesControllerTests
{
    [Theory]
    [InlineData("Family", "Mom")]
    [InlineData("Alumni", "Graduate")]
    [InlineData("Sports & Fitness", "Coach")]
    [InlineData("Other", "Member")]
    public void DefaultsMatchCommunityType(string groupType, string expectedRole)
    {
        var roles = CommunityRoleDefaults.ForGroupType(groupType);

        Assert.Contains(expectedRole, roles);
        if (groupType != "Family")
            Assert.DoesNotContain("Mom", roles);
    }

    [Fact]
    public void DefaultsCoverEverySupportedCommunityType()
    {
        string[] groupTypes =
        [
            "Family", "Friends", "Couples", "Parents & Kids", "Sports & Fitness",
            "School & Education", "Work & Professional", "Neighborhood & Local",
            "Hobbies & Interests", "Faith & Spiritual", "Clubs & Organizations",
            "Travel", "Alumni", "Support & Care", "Events & Social", "Other"
        ];

        Assert.All(groupTypes, groupType => Assert.NotEmpty(CommunityRoleDefaults.ForGroupType(groupType)));
        Assert.DoesNotContain("Mom", CommunityRoleDefaults.ForGroupType("Parents & Kids"));
        Assert.DoesNotContain("Mom", CommunityRoleDefaults.ForGroupType("Alumni"));
        Assert.DoesNotContain("Mom", CommunityRoleDefaults.ForGroupType("Sports & Fitness"));
        Assert.All(
            new[] { "Mom", "Dad", "Aunt", "Uncle", "Cousin", "Grandparent", "Sibling", "Friend", "Other" },
            role => Assert.Contains(role, CommunityRoleDefaults.ForGroupType("Family")));
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
