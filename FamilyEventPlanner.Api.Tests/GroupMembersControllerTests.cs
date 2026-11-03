using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace FamilyEventPlanner.Api.Tests;

public class GroupMembersControllerTests
{
    [Fact]
    public async Task UpdateAdminRoleRejectsRegularMembersPromotingOrRevoking()
    {
        await using var context = CreateContext();
        var group = AddGroup(context);
        var caller = AddMember(context, group, isAdmin: false);
        var member = AddMember(context, group, isAdmin: false);
        var admin = AddMember(context, group, isAdmin: true);
        await context.SaveChangesAsync();
        var controller = CreateController(context, caller.Id);

        var promote = await controller.UpdateAdminRole(
            group.Id, member.Id, new UpdateGroupMemberAdminRequest { IsAdmin = true });
        var revoke = await controller.UpdateAdminRole(
            group.Id, admin.Id, new UpdateGroupMemberAdminRequest { IsAdmin = false });

        Assert.IsType<ForbidResult>(promote);
        Assert.IsType<ForbidResult>(revoke);
        Assert.False(member.IsAdmin);
        Assert.True(admin.IsAdmin);
    }

    [Fact]
    public async Task GetMembersReturnsNamesAndRolesOnlyForRequestedGroup()
    {
        await using var context = CreateContext();
        var group = AddGroup(context);
        var otherGroup = AddGroup(context);
        var caller = AddMember(context, group, isAdmin: true);
        var member = AddMember(context, group, isAdmin: false);
        var otherGroupMember = AddMember(context, otherGroup, isAdmin: true);
        await context.SaveChangesAsync();
        var controller = CreateController(context, caller.Id);

        var result = Assert.IsType<OkObjectResult>(await controller.GetMembers(group.Id));
        using var members = JsonDocument.Parse(JsonSerializer.Serialize(result.Value));
        var returnedMembers = members.RootElement.EnumerateArray()
            .Select(entry => (
                MemberId: entry.GetProperty("memberId").GetGuid(),
                DisplayName: entry.GetProperty("displayName").GetString(),
                IsAdmin: entry.GetProperty("isAdmin").GetBoolean()))
            .ToList();

        Assert.Equal(2, returnedMembers.Count);
        Assert.Contains(returnedMembers, entry => entry.MemberId == caller.Id && entry.IsAdmin);
        Assert.Contains(returnedMembers, entry => entry.MemberId == member.Id && !entry.IsAdmin);
        Assert.All(returnedMembers, entry => Assert.Equal("Member", entry.DisplayName));
        Assert.DoesNotContain(returnedMembers, entry => entry.MemberId == otherGroupMember.Id);
    }

    [Fact]
    public async Task GetMembersRejectsCallerWhoBelongsToAnotherGroup()
    {
        await using var context = CreateContext();
        var group = AddGroup(context);
        var otherGroup = AddGroup(context);
        var caller = AddMember(context, otherGroup, isAdmin: true);
        await context.SaveChangesAsync();
        var controller = CreateController(context, caller.Id);

        Assert.IsType<ForbidResult>(await controller.GetMembers(group.Id));
    }

    [Fact]
    public async Task AdminCanPromoteAndRevokeAdminsWithoutChangingAnotherGroupsRole()
    {
        await using var context = CreateContext();
        var group = AddGroup(context);
        var otherGroup = AddGroup(context);
        var admin = AddMember(context, group, isAdmin: true);
        var target = AddMember(context, group, isAdmin: false);
        var otherAdmin = AddMember(context, group, isAdmin: true);
        var otherGroupMember = AddMember(context, otherGroup, isAdmin: false);
        await context.SaveChangesAsync();
        var controller = CreateController(context, admin.Id);

        Assert.IsType<OkObjectResult>(
            await controller.UpdateAdminRole(group.Id, target.Id, new UpdateGroupMemberAdminRequest { IsAdmin = true }));
        Assert.True(target.IsAdmin);

        Assert.IsType<OkObjectResult>(
            await controller.UpdateAdminRole(group.Id, target.Id, new UpdateGroupMemberAdminRequest { IsAdmin = false }));
        Assert.False(target.IsAdmin);

        Assert.IsType<OkObjectResult>(
            await controller.UpdateAdminRole(group.Id, otherAdmin.Id, new UpdateGroupMemberAdminRequest { IsAdmin = false }));
        Assert.False(otherAdmin.IsAdmin);

        Assert.IsType<BadRequestObjectResult>(
            await controller.UpdateAdminRole(group.Id, admin.Id, new UpdateGroupMemberAdminRequest { IsAdmin = false }));
        Assert.True(admin.IsAdmin);

        Assert.IsType<NotFoundResult>(
            await controller.UpdateAdminRole(group.Id, otherGroupMember.Id, new UpdateGroupMemberAdminRequest { IsAdmin = true }));
        Assert.False(otherGroupMember.IsAdmin);

        context.ChangeTracker.Clear();
        Assert.True(await context.GroupMembers.AnyAsync(member => member.Id == target.Id && !member.IsAdmin));
        Assert.True(await context.GroupMembers.AnyAsync(member => member.Id == otherAdmin.Id && !member.IsAdmin));
        Assert.True(await context.GroupMembers.AnyAsync(member => member.Id == admin.Id && member.IsAdmin));
        Assert.True(await context.GroupMembers.AnyAsync(member => member.Id == otherGroupMember.Id && !member.IsAdmin));
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
