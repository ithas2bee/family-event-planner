using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Models.Responses;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Tests;

public class FamilyGroupsControllerTests
{
    [Fact]
    public async Task GetMyGroupsReturnsEveryGroupForTheUserAndExcludesOtherUsersGroups()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "Current User");
        var other = AddUser(context, "Other User");
        var currentGroup = AddGroup(context, "Current Family");
        var secondGroup = AddGroup(context, "Second Family");
        var otherGroup = AddGroup(context, "Other Family");
        context.GroupMembers.AddRange(
            Member(user, currentGroup),
            Member(user, secondGroup),
            Member(other, otherGroup));
        await context.SaveChangesAsync();

        var result = await new FamilyGroupsController(context).GetMyGroups(user.Id);

        var groups = Assert.IsType<List<GroupSummaryResponse>>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Equal(2, groups.Count);
        Assert.Contains(groups, group => group.groupName == "Current Family");
        Assert.Contains(groups, group => group.groupName == "Second Family");
        Assert.DoesNotContain(groups, group => group.groupName == "Other Family");
    }

    [Fact]
    public async Task GetMyGroupsReturnsEmptyListWhenUserHasNoGroups()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "User Without Groups");
        await context.SaveChangesAsync();

        var result = await new FamilyGroupsController(context).GetMyGroups(user.Id);

        var groups = Assert.IsType<List<GroupSummaryResponse>>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Empty(groups);
    }

    [Fact]
    public async Task GetMyGroupsReturnsSingleMembership()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "Single Group User");
        var group = AddGroup(context, "Only Family");
        context.GroupMembers.Add(Member(user, group));
        await context.SaveChangesAsync();

        var result = await new FamilyGroupsController(context).GetMyGroups(user.Id);

        var groups = Assert.IsType<List<GroupSummaryResponse>>(Assert.IsType<OkObjectResult>(result).Value);
        var onlyGroup = Assert.Single(groups);
        Assert.Equal("Only Family", onlyGroup.groupName);
    }

    private static AppDbContext CreateContext() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .Options);

    private static User AddUser(AppDbContext context, string name)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = $"{Guid.NewGuid()}@example.com",
            DisplayName = name,
            CreatedAt = DateTime.UtcNow
        };
        context.Users.Add(user);
        return user;
    }

    private static FamilyGroup AddGroup(AppDbContext context, string name)
    {
        var group = new FamilyGroup
        {
            Id = Guid.NewGuid(),
            Name = name,
            InviteCode = Guid.NewGuid().ToString("N")[..6],
            CreatedAt = DateTime.UtcNow
        };
        context.FamilyGroups.Add(group);
        return group;
    }

    private static GroupMember Member(User user, FamilyGroup group) => new()
    {
        Id = Guid.NewGuid(),
        UserId = user.Id,
        User = user,
        FamilyGroupId = group.Id,
        FamilyGroup = group,
        JoinedAt = DateTime.UtcNow
    };
}
