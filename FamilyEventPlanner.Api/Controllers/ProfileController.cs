using System.Security.Claims;
using System.Text.Json;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/profile")]
public sealed class ProfileController : ControllerBase
{
    private static readonly HashSet<string> AllowedRoles = new(StringComparer.Ordinal)
    {
        "Mom", "Dad", "Aunt", "Uncle", "Cousin", "Grandparent", "Sibling", "Friend", "Other"
    };

    private readonly AppDbContext _context;

    public ProfileController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<ProfileResponse>> Get()
    {
        var user = await FindCurrentUser();
        if (user is null)
            return Unauthorized();

        return Ok(await ToResponse(user));
    }

    [HttpGet("communities/{groupId:guid}/members/{memberId:guid}")]
    public async Task<ActionResult<MemberProfileResponse>> GetCommunityMember(Guid groupId, Guid memberId)
    {
        var caller = await FindCurrentUser();
        if (caller is null)
            return Unauthorized();

        if (!await _context.GroupMembers.AnyAsync(member =>
                member.UserId == caller.Id && member.FamilyGroupId == groupId))
            return Forbid();

        var target = await _context.GroupMembers
            .Include(member => member.User)
            .FirstOrDefaultAsync(member => member.Id == memberId && member.FamilyGroupId == groupId);
        if (target is null)
            return NotFound();

        var sharedGroupIds = await _context.GroupMembers
            .Where(member => member.UserId == caller.Id)
            .Select(member => member.FamilyGroupId)
            .ToListAsync();
        var targetMemberships = await _context.GroupMembers
            .Include(member => member.FamilyGroup)
            .Where(member => member.UserId == target.UserId && sharedGroupIds.Contains(member.FamilyGroupId))
            .OrderBy(member => member.FamilyGroup.Name)
            .ToListAsync();

        var communities = new List<MemberProfileCommunityResponse>();
        foreach (var membership in targetMemberships)
        {
            var roles = await _context.CommunityRoleAssignments
                .Where(assignment => assignment.GroupMemberId == membership.Id &&
                                     assignment.CommunityRole.IsActive)
                .Select(assignment => assignment.CommunityRole.Name)
                .OrderBy(name => name)
                .ToListAsync();
            if (membership.CommunityRoleId.HasValue)
            {
                var legacyRole = await _context.CommunityRoles
                    .Where(role => role.Id == membership.CommunityRoleId.Value && role.IsActive)
                    .Select(role => role.Name)
                    .FirstOrDefaultAsync();
                if (legacyRole is not null && !roles.Contains(legacyRole, StringComparer.OrdinalIgnoreCase))
                    roles.Add(legacyRole);
            }

            communities.Add(new MemberProfileCommunityResponse
            {
                GroupId = membership.FamilyGroupId,
                CommunityName = membership.FamilyGroup.Name,
                Roles = roles
            });
        }

        return Ok(new MemberProfileResponse
        {
            IsOwnProfile = caller.Id == target.UserId,
            Name = target.User.DisplayName,
            Age = target.User.Age,
            Location = target.User.Location,
            Bio = target.User.Bio,
            ProfilePictureUrl = target.User.ProfilePictureUrl,
            Communities = communities
        });
    }

    [HttpPut]
    public async Task<ActionResult<ProfileResponse>> Update(UpdateProfileRequest request)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var user = await FindCurrentUser();
        if (user is null)
            return Unauthorized();

        var roles = (request.Roles ?? new List<string>())
            .Where(role => !string.IsNullOrWhiteSpace(role))
            .Select(role => role.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();
        if (roles.Any(role => !AllowedRoles.Contains(role)))
            return BadRequest(new { message = "One or more roles are not supported." });

        user.DisplayName = string.IsNullOrWhiteSpace(request.Name) ? null : request.Name.Trim();
        user.Age = request.Age;
        user.Location = Clean(request.Location);
        user.Bio = Clean(request.Bio);
        user.ProfilePictureUrl = Clean(request.ProfilePictureUrl);
        if (request.Roles is not null)
            user.RolesJson = JsonSerializer.Serialize(roles);

        if (request.CommunityRoles is not null)
        {
            if (request.CommunityRoles.Any(selection =>
                    selection is null || selection.GroupId == Guid.Empty || selection.RoleIds is null))
                return BadRequest(new { message = "Each community role selection must include a community and role list." });
            if (request.CommunityRoles.Select(item => item.GroupId).Distinct().Count() != request.CommunityRoles.Count)
                return BadRequest(new { message = "A community may be included only once." });

            var memberships = await _context.GroupMembers
                .Where(member => member.UserId == user.Id)
                .ToListAsync();
            var membershipsByGroup = memberships.ToDictionary(member => member.FamilyGroupId);
            if (request.CommunityRoles.Any(item => !membershipsByGroup.ContainsKey(item.GroupId)))
                return BadRequest(new { message = "Roles can only be selected in communities you belong to." });

            foreach (var selection in request.CommunityRoles)
            {
                var roleIds = selection.RoleIds.Distinct().ToArray();
                var availableRoleIds = await _context.CommunityRoles
                    .Where(role => role.FamilyGroupId == selection.GroupId && role.IsActive)
                    .Select(role => role.Id)
                    .ToListAsync();
                if (roleIds.Except(availableRoleIds).Any())
                    return BadRequest(new { message = "Select only active roles from that community." });

                var membership = membershipsByGroup[selection.GroupId];
                var oldAssignments = await _context.CommunityRoleAssignments
                    .Where(assignment => assignment.GroupMemberId == membership.Id)
                    .ToListAsync();
                var desiredRoleIds = roleIds.ToHashSet();
                _context.CommunityRoleAssignments.RemoveRange(
                    oldAssignments.Where(assignment => !desiredRoleIds.Contains(assignment.CommunityRoleId)));
                var existingRoleIds = oldAssignments.Select(assignment => assignment.CommunityRoleId).ToHashSet();
                foreach (var roleId in roleIds)
                {
                    if (!existingRoleIds.Contains(roleId))
                    {
                        _context.CommunityRoleAssignments.Add(new CommunityRoleAssignment
                        {
                            FamilyGroupId = selection.GroupId,
                            GroupMemberId = membership.Id,
                            CommunityRoleId = roleId
                        });
                    }
                }

                membership.CommunityRoleId = roleIds.Length == 0 ? null : roleIds[0];
            }
        }

        await _context.SaveChangesAsync();
        return Ok(await ToResponse(user));
    }

    private async Task<User?> FindCurrentUser()
    {
        var rawUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(rawUserId, out var userId)
            ? await _context.Users.FirstOrDefaultAsync(user => user.Id == userId)
            : null;
    }

    private async Task<ProfileResponse> ToResponse(User user)
    {
        var memberships = await _context.GroupMembers
            .Include(member => member.FamilyGroup)
            .Where(member => member.UserId == user.Id)
            .OrderBy(member => member.FamilyGroup.Name)
            .ToListAsync();
        var communities = new List<ProfileRoleGroupResponse>();
        foreach (var membership in memberships)
        {
            var availableRoles = await _context.CommunityRoles
                .Where(role => role.FamilyGroupId == membership.FamilyGroupId && role.IsActive)
                .OrderByDescending(role => role.IsDefault)
                .ThenBy(role => role.Name)
                .ToListAsync();
            var selectedRoleIds = await _context.CommunityRoleAssignments
                .Where(assignment => assignment.GroupMemberId == membership.Id &&
                                     assignment.CommunityRole.IsActive)
                .Select(assignment => assignment.CommunityRoleId)
                .ToListAsync();
            if (membership.CommunityRoleId.HasValue &&
                availableRoles.Any(role => role.Id == membership.CommunityRoleId.Value) &&
                !selectedRoleIds.Contains(membership.CommunityRoleId.Value))
                selectedRoleIds.Add(membership.CommunityRoleId.Value);

            communities.Add(new ProfileRoleGroupResponse
            {
                GroupId = membership.FamilyGroupId,
                CommunityName = membership.FamilyGroup.Name,
                Roles = availableRoles.Where(role => selectedRoleIds.Contains(role.Id))
                    .Select(role => role.Name).ToArray(),
                SelectedRoleIds = selectedRoleIds,
                AvailableRoles = availableRoles.Select(role => new ProfileRoleOptionResponse
                {
                    Id = role.Id,
                    Name = role.Name,
                    IsDefault = role.IsDefault
                }).ToArray()
            });
        }

        return new ProfileResponse
        {
            Name = user.DisplayName,
            Email = user.Email,
            Age = user.Age,
            Location = user.Location,
            Bio = user.Bio,
            ProfilePictureUrl = user.ProfilePictureUrl,
            Roles = ParseRoles(user.RolesJson),
            FamilyNames = memberships.Select(member => member.FamilyGroup.Name).Distinct().ToArray(),
            Communities = communities
        };
    }

    private static IReadOnlyList<string> ParseRoles(string? rolesJson)
    {
        if (string.IsNullOrWhiteSpace(rolesJson))
            return Array.Empty<string>();

        try
        {
            return JsonSerializer.Deserialize<List<string>>(rolesJson)?
                .Where(role => AllowedRoles.Contains(role))
                .Distinct(StringComparer.Ordinal)
                .ToArray() ?? Array.Empty<string>();
        }
        catch (JsonException)
        {
            return Array.Empty<string>();
        }
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
