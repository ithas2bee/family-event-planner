using Microsoft.AspNetCore.Mvc;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Models.Responses;
using FamilyEventPlanner.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace FamilyEventPlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FamilyGroupsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public FamilyGroupsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> CreateGroup([FromBody] CreateFamilyGroupRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Verify user exists
            var user = await _context.Users.FindAsync(request.UserId);
            if (user == null)
                return BadRequest(new { message = "User not found." });

            // generate a unique invite code (retry a few times on collision)
            string inviteCode = null;
            for (int i = 0; i < 5; i++)
            {
                var candidate = GenerateInviteCode();
                var exists = await _context.FamilyGroups.AnyAsync(g => g.InviteCode == candidate);
                if (!exists)
                {
                    inviteCode = candidate;
                    break;
                }
            }

            if (inviteCode == null)
                return StatusCode(500, new { message = "Could not generate unique invite code. Try again." });

            var group = new FamilyGroup
            {
                Id = Guid.NewGuid(),
                Name = request.Name.Trim(),
                GroupType = string.IsNullOrWhiteSpace(request.GroupType) ? "Other" : request.GroupType.Trim(),
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                IsInviteOnly = true,
                IsSearchable = false,
                InviteCode = inviteCode,
                CreatedAt = DateTime.UtcNow
            };

            _context.FamilyGroups.Add(group);

            // Add creator as admin member
            var creatorMember = new GroupMember
            {
                Id = Guid.NewGuid(),
                FamilyGroupId = group.Id,
                UserId = request.UserId,
                IsAdmin = true,
                JoinedAt = DateTime.UtcNow
            };

            _context.GroupMembers.Add(creatorMember);
            await _context.SaveChangesAsync();

            System.Diagnostics.Debug.WriteLine($"[CREATE GROUP] Group {group.Id} created by user {request.UserId} as admin member {creatorMember.Id}");

            // Return group info plus memberId for immediate navigation
            var response = new
            {
                groupId = group.Id,
                groupName = group.Name,
                groupType = group.GroupType,
                description = group.Description,
                isInviteOnly = group.IsInviteOnly,
                isSearchable = group.IsSearchable,
                inviteCode = group.InviteCode,
                createdAt = group.CreatedAt,
                memberId = creatorMember.Id,
                isAdmin = creatorMember.IsAdmin
            };

            return CreatedAtAction(nameof(GetGroup), new { id = group.Id }, response);
        }

        [HttpGet("my/{userId}")]
        public async Task<IActionResult> GetMyGroups(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new { message = "User not found." });

            var groups = await _context.GroupMembers
                .Where(m => m.UserId == userId)
                .Include(m => m.FamilyGroup)
                .Select(m => new GroupSummaryResponse
                {
                    groupId = m.FamilyGroupId,
                    groupName = m.FamilyGroup.Name,
                    inviteCode = m.FamilyGroup.InviteCode,
                    isAdmin = m.IsAdmin,
                    memberId = m.Id,
                    joinedAt = m.JoinedAt
                })
                .ToListAsync();

            return Ok(groups);
        }

        [Microsoft.AspNetCore.Authorization.Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme + ",MemberId")]
        [HttpGet("search")]
        public async Task<IActionResult> SearchGroups([FromQuery] string? query)
        {
            var userId = await GetAuthenticatedUserIdAsync();

            if (userId == null)
                return Unauthorized();

            var searchTerm = query?.Trim();
            if (string.IsNullOrEmpty(searchTerm))
                return Ok(new List<GroupSearchResponse>());

            var normalizedSearchTerm = searchTerm.ToLowerInvariant();
            var groupsQuery = _context.FamilyGroups
                .Where(g => g.IsSearchable &&
                    !_context.GroupMembers.Any(m => m.FamilyGroupId == g.Id && m.UserId == userId.Value) &&
                    g.Name.ToLower().Contains(normalizedSearchTerm));

            var groups = await groupsQuery
                .OrderBy(g => g.Name)
                .Select(g => new GroupSearchResponse
                {
                    groupId = g.Id,
                    groupName = g.Name,
                    groupType = g.GroupType,
                    isInviteOnly = g.IsInviteOnly,
                    accessMode = g.IsInviteOnly
                        ? "InviteOnlySearchable"
                        : "CommunitySearchableRequestToJoin",
                    requestStatus = _context.GroupMembershipRequests
                        .Where(r => r.FamilyGroupId == g.Id && r.UserId == userId.Value && r.Status == "Pending")
                        .Select(r => r.Status)
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(groups);
        }

        [Microsoft.AspNetCore.Authorization.Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme + ",MemberId")]
        [HttpPost("{id}/membership-requests")]
        public async Task<IActionResult> RequestMembership(Guid id)
        {
            var userId = await GetAuthenticatedUserIdAsync();
            if (userId == null)
                return Unauthorized();
            if (!await _context.Users.AnyAsync(u => u.Id == userId.Value))
                return Unauthorized();

            var group = await _context.FamilyGroups.FindAsync(id);
            if (group == null)
                return NotFound();
            if (group.IsInviteOnly || !group.IsSearchable)
                return Forbid();

            if (await _context.GroupMembers.AnyAsync(m => m.FamilyGroupId == id && m.UserId == userId.Value))
                return Conflict(new { message = "You are already a member of this group." });

            if (await _context.GroupMembershipRequests.AnyAsync(r =>
                    r.FamilyGroupId == id && r.UserId == userId.Value && r.Status == "Pending"))
                return Conflict(new { message = "A membership request is already pending." });

            var now = DateTime.UtcNow;
            var request = new GroupMembershipRequest
            {
                Id = Guid.NewGuid(),
                UserId = userId.Value,
                FamilyGroupId = id,
                Status = "Pending",
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.GroupMembershipRequests.Add(request);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                if (!await _context.GroupMembershipRequests.AnyAsync(r =>
                        r.FamilyGroupId == id && r.UserId == userId.Value && r.Status == "Pending"))
                    throw;

                return Conflict(new { message = "A membership request is already pending." });
            }

            return Ok(new
            {
                requestStatus = request.Status,
                createdAt = request.CreatedAt,
                updatedAt = request.UpdatedAt
            });
        }

        [HttpGet("{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(AuthenticationSchemes = "MemberId")]
        public async Task<IActionResult> GetGroup(Guid id)
        {
            var g = await _context.FamilyGroups.FindAsync(id);
            if (g == null)
                return NotFound();

            var memberId = GetAuthenticatedMemberId();
            var member = await _context.GroupMembers
                .FirstOrDefaultAsync(m => m.Id == memberId && m.FamilyGroupId == id);
            if (member == null)
                return Forbid();

            var memberCount = await _context.GroupMembers.CountAsync(m => m.FamilyGroupId == id);
            return Ok(new
            {
                groupId = g.Id,
                groupName = g.Name,
                groupType = g.GroupType,
                description = g.Description,
                isInviteOnly = g.IsInviteOnly,
                isSearchable = g.IsSearchable,
                accessMode = GetAccessMode(g.IsInviteOnly, g.IsSearchable),
                memberCount,
                isAdmin = member.IsAdmin
            });
        }

        [Microsoft.AspNetCore.Authorization.Authorize(AuthenticationSchemes = "MemberId")]
        [HttpPut("{id}/access")]
        public async Task<IActionResult> UpdateAccess(Guid id, [FromBody] UpdateGroupAccessRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var member = await _context.GroupMembers
                .FirstOrDefaultAsync(m => m.Id == GetAuthenticatedMemberId() && m.FamilyGroupId == id);
            if (member == null || !member.IsAdmin)
                return Forbid();

            var access = request.AccessMode switch
            {
                "InviteOnlyNotSearchable" => (IsInviteOnly: true, IsSearchable: false),
                "InviteOnlySearchable" => (IsInviteOnly: true, IsSearchable: true),
                "CommunitySearchableRequestToJoin" => (IsInviteOnly: false, IsSearchable: true),
                _ => ((bool IsInviteOnly, bool IsSearchable)?)null
            };
            if (access == null)
                return BadRequest(new { message = "Unsupported group access configuration." });

            var group = await _context.FamilyGroups.FindAsync(id);
            if (group == null)
                return NotFound();

            group.IsInviteOnly = access.Value.IsInviteOnly;
            group.IsSearchable = access.Value.IsSearchable;
            await _context.SaveChangesAsync();
            return Ok(new
            {
                accessMode = request.AccessMode,
                isInviteOnly = group.IsInviteOnly,
                isSearchable = group.IsSearchable
            });
        }

        [Microsoft.AspNetCore.Authorization.Authorize(AuthenticationSchemes = "MemberId")]
        [HttpPut("{id}/description")]
        public async Task<IActionResult> UpdateDescription(Guid id, [FromBody] UpdateGroupDescriptionRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var member = await _context.GroupMembers
                .FirstOrDefaultAsync(m => m.Id == GetAuthenticatedMemberId() && m.FamilyGroupId == id);
            if (member == null)
                return Forbid();
            if (!member.IsAdmin)
                return Forbid();

            var group = await _context.FamilyGroups.FindAsync(id);
            if (group == null)
                return NotFound();

            group.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            await _context.SaveChangesAsync();
            return Ok(new { description = group.Description });
        }

        // Note: Removed public GetGroups() endpoint.
        // Returning all groups without authentication is a security risk.
        // To add back: require [Authorize] and only return groups where caller is a member.

        private string GenerateInviteCode()
        {
            return Guid.NewGuid().ToString().Substring(0, 6).ToUpper();
        }

        private Guid GetAuthenticatedMemberId()
        {
            return Guid.TryParse(User.FindFirst("memberId")?.Value, out var memberId) ? memberId : Guid.Empty;
        }

        private async Task<Guid?> GetAuthenticatedUserIdAsync()
        {
            if (Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
                return userId;

            if (Guid.TryParse(User.FindFirst("memberId")?.Value, out var memberId))
            {
                return await _context.GroupMembers
                    .Where(m => m.Id == memberId)
                    .Select(m => (Guid?)m.UserId)
                    .SingleOrDefaultAsync();
            }

            return null;
        }

        private static string GetAccessMode(bool isInviteOnly, bool isSearchable)
        {
            if (!isInviteOnly)
                return "CommunitySearchableRequestToJoin";
            return isSearchable ? "InviteOnlySearchable" : "InviteOnlyNotSearchable";
        }
    }
}
