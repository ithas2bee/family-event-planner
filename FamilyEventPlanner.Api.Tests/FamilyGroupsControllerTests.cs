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
        Assert.Equal(
            ["Coach", "Player", "Team Manager", "Trainer"],
            await context.CommunityRoles.Where(role => role.FamilyGroupId == group.Id)
                .OrderBy(role => role.Name).Select(role => role.Name).ToArrayAsync());
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
        Assert.Equal(
            ["Coordinator", "Guest", "Member", "Organizer"],
            await context.CommunityRoles.Where(role => role.FamilyGroupId == group.Id)
                .OrderBy(role => role.Name).Select(role => role.Name).ToArrayAsync());
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

        var result = await controller.SearchGroups("Search");

        var groups = Assert.IsType<List<GroupSearchResponse>>(Assert.IsType<OkObjectResult>(result).Value);
        Assert.Equal("Searchable Group", Assert.Single(groups).groupName);
    }

    [Fact]
    public async Task RequestMembershipCreatesPendingRequestWithoutAddingMemberAndSearchPersistsStatus()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "requester@example.com",
            DisplayName = "Requester",
            CreatedAt = DateTime.UtcNow
        };
        var group = new FamilyGroup
        {
            Id = Guid.NewGuid(),
            Name = "Open Community",
            IsInviteOnly = false,
            IsSearchable = true,
            CreatedAt = DateTime.UtcNow
        };
        await using (var context = new AppDbContext(options))
        {
            context.Users.Add(user);
            context.FamilyGroups.Add(group);
            await context.SaveChangesAsync();
            var controller = new FamilyGroupsController(context);
            SetUser(controller, user.Id);

            var result = await controller.RequestMembership(group.Id);

            var response = Assert.IsType<OkObjectResult>(result).Value!;
            Assert.Equal("Pending", response.GetType().GetProperty("requestStatus")!.GetValue(response));
            Assert.Equal(user.Id, Assert.Single(context.GroupMembershipRequests).UserId);
            Assert.Empty(context.GroupMembers);
        }

        await using (var reopenedContext = new AppDbContext(options))
        {
            var controller = new FamilyGroupsController(reopenedContext);
            SetUser(controller, user.Id);

            var result = await controller.SearchGroups("Open");

            var searchResult = Assert.Single(Assert.IsType<List<GroupSearchResponse>>(Assert.IsType<OkObjectResult>(result).Value));
            Assert.Equal("Pending", searchResult.requestStatus);
        }
    }

    [Fact]
    public async Task RequestMembershipRejectsDuplicatePendingRequestsAndExistingMembers()
    {
        await using var context = CreateContext();
        var user = AddUser(context, "Requester");
        var duplicateGroup = AddGroup(context, "Duplicate Request");
        duplicateGroup.IsInviteOnly = false;
        duplicateGroup.IsSearchable = true;
        var memberGroup = AddGroup(context, "Existing Member");
        memberGroup.IsInviteOnly = false;
        memberGroup.IsSearchable = true;
        context.GroupMembershipRequests.Add(new GroupMembershipRequest
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            FamilyGroupId = duplicateGroup.Id,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        context.GroupMembers.Add(Member(user, memberGroup));
        await context.SaveChangesAsync();
        var controller = new FamilyGroupsController(context);
        SetUser(controller, user.Id);

        Assert.IsType<ConflictObjectResult>(await controller.RequestMembership(duplicateGroup.Id));
        Assert.IsType<ConflictObjectResult>(await controller.RequestMembership(memberGroup.Id));
        Assert.Single(context.GroupMembershipRequests);
    }

    [Theory]
    [InlineData(true, false, false)]
    [InlineData(true, true, false)]
    [InlineData(false, true, true)]
    public async Task RequestMembershipOnlyAllowsSearchableCommunityGroups(
        bool isInviteOnly,
        bool isSearchable,
        bool succeeds)
    {
        await using var context = CreateContext();
        var user = AddUser(context, "Requester");
        var group = AddGroup(context, "Access Rules");
        group.IsInviteOnly = isInviteOnly;
        group.IsSearchable = isSearchable;
        await context.SaveChangesAsync();
        var controller = new FamilyGroupsController(context);
        SetUser(controller, user.Id);

        var result = await controller.RequestMembership(group.Id);

        if (succeeds)
        {
            Assert.IsType<OkObjectResult>(result);
            Assert.Equal("Pending", Assert.Single(context.GroupMembershipRequests).Status);
        }
        else
        {
            Assert.IsType<ForbidResult>(result);
            Assert.Empty(context.GroupMembershipRequests);
        }
    }

    [Fact]
    public async Task RequestMembershipUsesAuthenticatedIdentityAndRequiresAuthentication()
    {
        var authorization = typeof(FamilyGroupsController)
            .GetMethod(nameof(FamilyGroupsController.RequestMembership))!
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .Single();
        Assert.Equal("Bearer,MemberId", authorization.AuthenticationSchemes);

        await using var context = CreateContext();
        var caller = AddUser(context, "Authenticated User");
        var otherUser = AddUser(context, "Other User");
        var group = AddGroup(context, "Identity Check");
        group.IsInviteOnly = false;
        group.IsSearchable = true;
        await context.SaveChangesAsync();
        var controller = new FamilyGroupsController(context)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };

        Assert.IsType<UnauthorizedResult>(await controller.RequestMembership(group.Id));

        SetUser(controller, caller.Id);
        Assert.IsType<OkObjectResult>(await controller.RequestMembership(group.Id));
        Assert.Equal(caller.Id, Assert.Single(context.GroupMembershipRequests).UserId);
        Assert.NotEqual(otherUser.Id, context.GroupMembershipRequests.Single().UserId);
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

    [Fact]
    public async Task AdminCanListOnlyPendingRequestsForTheirSearchableCommunityGroup()
    {
        await using var context = CreateContext();
        var adminUser = AddUser(context, "Group Admin");
        var requester = AddUser(context, "Requesting Member");
        var group = AddGroup(context, "Community Group");
        group.IsInviteOnly = false;
        group.IsSearchable = true;
        var admin = Member(adminUser, group);
        admin.IsAdmin = true;
        context.GroupMembers.Add(admin);
        var pending = new GroupMembershipRequest
        {
            Id = Guid.NewGuid(), UserId = requester.Id, User = requester, FamilyGroupId = group.Id,
            FamilyGroup = group, Status = "Pending", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        context.GroupMembershipRequests.Add(pending);
        context.GroupMembershipRequests.Add(new GroupMembershipRequest
        {
            Id = Guid.NewGuid(), UserId = AddUser(context, "Already Reviewed").Id,
            FamilyGroupId = group.Id, Status = "Rejected", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var controller = new FamilyGroupsController(context);
        SetMember(controller, admin.Id);
        var result = Assert.IsType<OkObjectResult>(await controller.GetPendingMembershipRequests(group.Id));

        var item = Assert.Single(Assert.IsAssignableFrom<System.Collections.IEnumerable>(result.Value)
            .Cast<object>());
        Assert.Equal(pending.Id, item.GetType().GetProperty("requestId")!.GetValue(item));
        Assert.Equal(requester.DisplayName, item.GetType().GetProperty("displayName")!.GetValue(item));

        var member = Member(AddUser(context, "Regular Member"), group);
        context.GroupMembers.Add(member);
        await context.SaveChangesAsync();
        SetMember(controller, member.Id);
        Assert.IsType<ForbidResult>(await controller.GetPendingMembershipRequests(group.Id));
        Assert.IsType<ForbidResult>(await controller.ApproveMembershipRequest(group.Id, pending.Id));
        Assert.IsType<ForbidResult>(await controller.RejectMembershipRequest(group.Id, pending.Id));
    }

    [Fact]
    public async Task AdminApprovalAddsRegularMemberAndCannotBeRepeatedOrRequestedAgain()
    {
        await using var context = CreateContext();
        var adminUser = AddUser(context, "Group Admin");
        var requester = AddUser(context, "Requester");
        var group = AddGroup(context, "Community Group");
        group.IsInviteOnly = false;
        group.IsSearchable = true;
        var admin = Member(adminUser, group);
        admin.IsAdmin = true;
        var request = new GroupMembershipRequest
        {
            Id = Guid.NewGuid(), UserId = requester.Id, User = requester, FamilyGroupId = group.Id,
            FamilyGroup = group, Status = "Pending", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        context.GroupMembers.Add(admin);
        context.GroupMembershipRequests.Add(request);
        await context.SaveChangesAsync();
        var controller = new FamilyGroupsController(context);
        SetMember(controller, admin.Id);

        Assert.IsType<OkObjectResult>(await controller.ApproveMembershipRequest(group.Id, request.Id));
        var newMember = await context.GroupMembers.SingleAsync(m => m.UserId == requester.Id);
        Assert.False(newMember.IsAdmin);
        Assert.Equal("Approved", request.Status);
        Assert.IsType<ConflictObjectResult>(await controller.ApproveMembershipRequest(group.Id, request.Id));

        var requesterController = new FamilyGroupsController(context);
        SetUser(requesterController, requester.Id);
        Assert.IsType<ConflictObjectResult>(await requesterController.RequestMembership(group.Id));
    }

    [Fact]
    public async Task AdminRejectionDoesNotCreateMembershipAndCannotBeRepeated()
    {
        await using var context = CreateContext();
        var adminUser = AddUser(context, "Group Admin");
        var requester = AddUser(context, "Requester");
        var group = AddGroup(context, "Community Group");
        group.IsInviteOnly = false;
        group.IsSearchable = true;
        var admin = Member(adminUser, group);
        admin.IsAdmin = true;
        var request = new GroupMembershipRequest
        {
            Id = Guid.NewGuid(), UserId = requester.Id, User = requester, FamilyGroupId = group.Id,
            FamilyGroup = group, Status = "Pending", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        context.GroupMembers.Add(admin);
        context.GroupMembershipRequests.Add(request);
        await context.SaveChangesAsync();
        var controller = new FamilyGroupsController(context);
        SetMember(controller, admin.Id);

        Assert.IsType<OkObjectResult>(await controller.RejectMembershipRequest(group.Id, request.Id));
        Assert.Equal("Rejected", request.Status);
        Assert.Empty(await context.GroupMembers.Where(m => m.UserId == requester.Id).ToListAsync());
        Assert.IsType<ConflictObjectResult>(await controller.RejectMembershipRequest(group.Id, request.Id));
    }

    [Fact]
    public async Task AdminCannotProcessRequestsFromAnotherGroupOrInviteOnlyGroups()
    {
        await using var context = CreateContext();
        var adminUser = AddUser(context, "Group Admin");
        var requester = AddUser(context, "Requester");
        var adminGroup = AddGroup(context, "Admin Group");
        adminGroup.IsInviteOnly = false;
        adminGroup.IsSearchable = true;
        var otherGroup = AddGroup(context, "Other Group");
        otherGroup.IsInviteOnly = false;
        otherGroup.IsSearchable = true;
        var admin = Member(adminUser, adminGroup);
        admin.IsAdmin = true;
        var request = new GroupMembershipRequest
        {
            Id = Guid.NewGuid(), UserId = requester.Id, FamilyGroupId = otherGroup.Id,
            Status = "Pending", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        context.GroupMembers.Add(admin);
        context.GroupMembershipRequests.Add(request);
        await context.SaveChangesAsync();
        var controller = new FamilyGroupsController(context);
        SetMember(controller, admin.Id);

        Assert.IsType<NotFoundResult>(await controller.ApproveMembershipRequest(adminGroup.Id, request.Id));
        Assert.Equal("Pending", request.Status);

        adminGroup.IsInviteOnly = true;
        Assert.IsType<ForbidResult>(await controller.GetPendingMembershipRequests(adminGroup.Id));
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
