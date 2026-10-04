using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Models.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FamilyEventPlanner.Api.Tests;

public class FamilyGroupsControllerTests
{
    [Fact]
    public async Task CreateGroupPersistsDetailsAndPrivateDefaults()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "Group Creator");
        await context.SaveChangesAsync();

        var result = await new FamilyGroupsController(context).CreateGroup(new CreateFamilyGroupRequest
        {
            Name = "Weekend Hikers",
            GroupType = "Sports & Fitness",
            Description = "Local trails and weekend walks",
            UserId = user.Id
        });

        Assert.IsType<CreatedAtActionResult>(result);
        var group = await context.FamilyGroups.SingleAsync();
        Assert.Equal("Weekend Hikers", group.Name);
        Assert.Equal("Sports & Fitness", group.GroupType);
        Assert.Equal("Local trails and weekend walks", group.Description);
        Assert.True(group.IsInviteOnly);
        Assert.False(group.IsSearchable);
    }

    [Fact]
    public async Task CreateGroupKeepsLegacyRequestsPrivateAndDefaultsTypeToOther()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "Group Creator");
        await context.SaveChangesAsync();

        var result = await new FamilyGroupsController(context).CreateGroup(new CreateFamilyGroupRequest
        {
            Name = "Legacy Family",
            UserId = user.Id
        });

        Assert.IsType<CreatedAtActionResult>(result);
        var group = await context.FamilyGroups.SingleAsync();
        Assert.Equal("Other", group.GroupType);
        Assert.Null(group.Description);
        Assert.True(group.IsInviteOnly);
        Assert.False(group.IsSearchable);
    }

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

    [Fact]
    public async Task SearchGroupsReturnsCaseInsensitivePartialMatchesWithoutPrivateOrMemberGroups()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "Search User");
        var matchingCommunity = AddGroup(context, "Garage Crew");
        matchingCommunity.GroupType = "Sports & Fitness";
        matchingCommunity.IsInviteOnly = false;
        matchingCommunity.IsSearchable = true;
        var matchingInviteOnly = AddGroup(context, "Atlanta Parents");
        matchingInviteOnly.IsSearchable = true;
        var privateGroup = AddGroup(context, "Garage Hidden");
        var memberGroup = AddGroup(context, "Garage Members");
        memberGroup.IsSearchable = true;
        context.GroupMembers.Add(Member(user, memberGroup));
        context.GroupMembers.Add(Member(AddUser(context, "Other User"), matchingCommunity));
        await context.SaveChangesAsync();
        var controller = new FamilyGroupsController(context);
        SetUser(controller, user.Id);

        var result = await controller.SearchGroups("gArAgE");

        var groups = Assert.IsType<List<GroupSearchResponse>>(Assert.IsType<OkObjectResult>(result).Value);
        var community = Assert.Single(groups);
        Assert.Equal("Garage Crew", community.groupName);
        Assert.Equal("Sports & Fitness", community.groupType);
        Assert.Equal("CommunitySearchableRequestToJoin", community.accessMode);
        Assert.False(community.isInviteOnly);
        Assert.DoesNotContain(groups, group => group.groupName == privateGroup.Name);
        Assert.DoesNotContain(groups, group => group.groupName == memberGroup.Name);
        Assert.Null(community.GetType().GetProperty("description"));
        Assert.Null(community.GetType().GetProperty("inviteCode"));
    }

    [Fact]
    public async Task SearchGroupsIdentifiesInviteOnlyAndCommunityAccess()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "Search User");
        var inviteOnly = AddGroup(context, "Atlanta Parents");
        inviteOnly.IsSearchable = true;
        var community = AddGroup(context, "Garage Crew");
        community.IsInviteOnly = false;
        community.IsSearchable = true;
        await context.SaveChangesAsync();
        var controller = new FamilyGroupsController(context);
        SetUser(controller, user.Id);

        var result = await controller.SearchGroups("a");

        var groups = Assert.IsType<List<GroupSearchResponse>>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Equal(2, groups.Count);
        Assert.Contains(groups, group =>
            group.groupName == "Atlanta Parents" &&
            group.accessMode == "InviteOnlySearchable" &&
            group.isInviteOnly);
        Assert.Contains(groups, group =>
            group.groupName == "Garage Crew" &&
            group.accessMode == "CommunitySearchableRequestToJoin" &&
            !group.isInviteOnly);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task SearchGroupsReturnsNoResultsForEmptyOrWhitespaceQuery(string? query)
    {
        await using var context = CreateContext();
        var user = AddUser(context, "Search User");
        var searchableGroup = AddGroup(context, "Searchable Group");
        searchableGroup.IsSearchable = true;
        await context.SaveChangesAsync();
        var controller = new FamilyGroupsController(context);
        SetUser(controller, user.Id);

        var result = await controller.SearchGroups(query);

        var groups = Assert.IsType<List<GroupSearchResponse>>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Empty(groups);
    }

    [Fact]
    public async Task SearchGroupsRequiresAuthenticatedUserIdentity()
    {
        var authorization = typeof(FamilyGroupsController)
            .GetMethod(nameof(FamilyGroupsController.SearchGroups))!
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .Single();
        Assert.Equal("Bearer,MemberId", authorization.AuthenticationSchemes);

        await using var context = CreateContext();
        var group = AddGroup(context, "Private Group");
        group.IsSearchable = false;
        await context.SaveChangesAsync();
        var controller = new FamilyGroupsController(context);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        Assert.IsType<UnauthorizedResult>(await controller.SearchGroups(null));
    }

    [Fact]
    public async Task SearchGroupsUsesAuthenticatedMembersUserAndExcludesTheirMemberships()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "Search User");
        var memberGroup = AddGroup(context, "Current Group");
        memberGroup.IsSearchable = true;
        var discoverableGroup = AddGroup(context, "Searchable Group");
        discoverableGroup.IsSearchable = true;
        var member = Member(user, memberGroup);
        context.GroupMembers.Add(member);
        await context.SaveChangesAsync();
        var controller = new FamilyGroupsController(context);
        SetMember(controller, member.Id);

        var result = await controller.SearchGroups(null);

        var groups = Assert.IsType<List<GroupSearchResponse>>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Equal("Searchable Group", Assert.Single(groups).groupName);
    }

    [Fact]
    public async Task GetGroupReturnsDetailsAndAdminStatusOnlyToMembers()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "Group Admin");
        var group = AddGroup(context, "Weekend Hikers");
        var admin = Member(user, group);
        admin.IsAdmin = true;
        context.GroupMembers.Add(admin);
        await context.SaveChangesAsync();
        var controller = new FamilyGroupsController(context);
        SetMember(controller, admin.Id);

        var result = await controller.GetGroup(group.Id);

        var value = Assert.IsType<OkObjectResult>(result).Value!;
        Assert.Equal(group.Id, value.GetType().GetProperty("groupId")!.GetValue(value));
        Assert.Equal("Weekend Hikers", value.GetType().GetProperty("groupName")!.GetValue(value));
        Assert.Equal(true, value.GetType().GetProperty("isAdmin")!.GetValue(value));
        Assert.Null(value.GetType().GetProperty("inviteCode"));

        SetMember(controller, Guid.NewGuid());
        Assert.IsType<ForbidResult>(await controller.GetGroup(group.Id));
    }

    [Fact]
    public async Task UpdateDescriptionIsAdminOnlyAndCannotChangeNameOrCommunityType()
    {
        await using var context = CreateContext();
        var adminUser = AddUser(context, "Group Admin");
        var memberUser = AddUser(context, "Group Member");
        var group = AddGroup(context, "Weekend Hikers");
        group.GroupType = "Sports & Fitness";
        var admin = Member(adminUser, group);
        admin.IsAdmin = true;
        var member = Member(memberUser, group);
        context.GroupMembers.AddRange(admin, member);
        await context.SaveChangesAsync();
        var controller = new FamilyGroupsController(context);

        SetMember(controller, member.Id);
        Assert.IsType<ForbidResult>(await controller.UpdateDescription(group.Id, new UpdateGroupDescriptionRequest
        {
            Description = "Not allowed"
        }));

        SetMember(controller, admin.Id);
        Assert.IsType<OkObjectResult>(await controller.UpdateDescription(group.Id, new UpdateGroupDescriptionRequest
        {
            Description = "  Weekend trail walks  "
        }));
        Assert.Equal("Weekend trail walks", group.Description);
        Assert.Equal("Weekend Hikers", group.Name);
        Assert.Equal("Sports & Fitness", group.GroupType);
    }

    [Theory]
    [InlineData("InviteOnlyNotSearchable", true, false)]
    [InlineData("InviteOnlySearchable", true, true)]
    [InlineData("CommunitySearchableRequestToJoin", false, true)]
    public async Task AdminCanChangeGroupAccessAndSelectionPersists(
        string accessMode,
        bool isInviteOnly,
        bool isSearchable)
    {
        await using var context = CreateContext();
        var user = AddUser(context, "Group Admin");
        var group = AddGroup(context, "Weekend Hikers");
        var admin = Member(user, group);
        admin.IsAdmin = true;
        context.GroupMembers.Add(admin);
        await context.SaveChangesAsync();
        var controller = new FamilyGroupsController(context);
        SetMember(controller, admin.Id);

        var result = await controller.UpdateAccess(group.Id, new UpdateGroupAccessRequest { AccessMode = accessMode });

        Assert.IsType<OkObjectResult>(result);
        await context.Entry(group).ReloadAsync();
        Assert.Equal(isInviteOnly, group.IsInviteOnly);
        Assert.Equal(isSearchable, group.IsSearchable);
        Assert.Equal("Weekend Hikers", group.Name);
    }

    [Fact]
    public async Task GroupAccessRejectsMembersAndUnsupportedConfigurations()
    {
        await using var context = CreateContext();
        var adminUser = AddUser(context, "Group Admin");
        var memberUser = AddUser(context, "Group Member");
        var group = AddGroup(context, "Weekend Hikers");
        var admin = Member(adminUser, group);
        admin.IsAdmin = true;
        var member = Member(memberUser, group);
        context.GroupMembers.AddRange(admin, member);
        await context.SaveChangesAsync();
        var controller = new FamilyGroupsController(context);

        SetMember(controller, member.Id);
        Assert.IsType<ForbidResult>(await controller.UpdateAccess(group.Id, new UpdateGroupAccessRequest
        {
            AccessMode = "InviteOnlySearchable"
        }));

        SetMember(controller, admin.Id);
        Assert.IsType<BadRequestObjectResult>(await controller.UpdateAccess(group.Id, new UpdateGroupAccessRequest
        {
            AccessMode = "CommunityNotSearchable"
        }));
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

    private static void SetMember(ControllerBase controller, Guid memberId)
    {
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
    }

    private static void SetUser(ControllerBase controller, Guid userId)
    {
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString())
                }, "test"))
            }
        };
    }
}
