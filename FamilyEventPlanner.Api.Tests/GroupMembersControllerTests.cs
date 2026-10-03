using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FamilyEventPlanner.Api.Tests;

public class GroupMembersControllerTests
{
    [Fact]
    public async Task UpdateAdminRoleRejectsRegularMembers()
    {
        await using var context = CreateContext();
        var group = AddGroup(context);
        var caller = AddMember(context, group, isAdmin: false);
        var target = AddMember(context, group, isAdmin: false);
        await context.SaveChangesAsync();
        var controller = CreateController(context, caller.Id);

        var result = await controller.UpdateAdminRole(group.Id, target.Id, new UpdateGroupMemberAdminRequest { IsAdmin = true });

        Assert.IsType<ForbidResult>(result);
        Assert.False(target.IsAdmin);
    }

    [Fact]
    public async Task AdminCanPromoteMemberAndCannotRemoveLastAdmin()
    {
        await using var context = CreateContext();
        var group = AddGroup(context);
        var admin = AddMember(context, group, isAdmin: true);
        var target = AddMember(context, group, isAdmin: false);
        await context.SaveChangesAsync();
        var controller = CreateController(context, admin.Id);

        Assert.IsType<OkObjectResult>(
            await controller.UpdateAdminRole(group.Id, target.Id, new UpdateGroupMemberAdminRequest { IsAdmin = true }));
        Assert.True(target.IsAdmin);

        Assert.IsType<OkObjectResult>(
            await controller.UpdateAdminRole(group.Id, target.Id, new UpdateGroupMemberAdminRequest { IsAdmin = false }));
        Assert.False(target.IsAdmin);

        Assert.IsType<BadRequestObjectResult>(
            await controller.UpdateAdminRole(group.Id, admin.Id, new UpdateGroupMemberAdminRequest { IsAdmin = false }));
        Assert.True(admin.IsAdmin);
        Assert.True(await context.GroupMembers.AnyAsync(member => member.Id == admin.Id && member.IsAdmin));
    }

    private static AppDbContext CreateContext() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .Options);

    private static FamilyGroup AddGroup(AppDbContext context)
    {
        var group = new FamilyGroup
        {
            Id = Guid.NewGuid(),
            Name = "Group",
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
            DisplayName = "Member",
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

    private static GroupMembersController CreateController(AppDbContext context, Guid memberId)
    {
        var controller = new GroupMembersController(context);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim("memberId", memberId.ToString())
                }, "test"))
            }
        };
        return controller;
    }
}
