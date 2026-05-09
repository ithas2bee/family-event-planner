using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FamilyEventPlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GroupMembersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GroupMembersController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Join a family group using an invite code and a UserId.
        /// </summary>
        [HttpPost("join")]
        public async Task<IActionResult> JoinGroup([FromBody] JoinGroupRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var group = await _context.FamilyGroups
                .FirstOrDefaultAsync(g => g.InviteCode == request.InviteCode);

            if (group == null)
                return NotFound("Invalid invite code.");

            // Check if user is already a member of this group
            var existingMember = await _context.GroupMembers.FirstOrDefaultAsync(m =>
                m.FamilyGroupId == group.Id &&
                m.UserId == request.UserId);

            if (existingMember != null)
            {
                // Return a clear, client-friendly error so frontend can display the message
                System.Diagnostics.Debug.WriteLine($"[JOIN GROUP] User {request.UserId} is already a member of group {group.Id}");
                return Conflict(new { message = "User is already a member of this group" });
            }

            // Load user
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId);
            if (user == null)
                return BadRequest("User not found.");

            var member = new GroupMember
            {
                Id = Guid.NewGuid(),
                FamilyGroupId = group.Id,
                UserId = user.Id,
                IsAdmin = false,
                JoinedAt = DateTime.UtcNow
            };

            _context.GroupMembers.Add(member);
            await _context.SaveChangesAsync();

            _context.ActivityFeed.Add(new ActivityFeed
            {
                Id = Guid.NewGuid(),
                FamilyGroupId = group.Id,
                ActorMemberId = member.Id,
                ActivityType = "MemberJoined",
                RelatedEntityId = null,
                RelatedEntityType = null,
                MetadataJson = $"{{\"displayName\":\"{user.DisplayName}\"}}",
                CreatedAtUtc = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            // Return camelCase JSON response for React frontend
            var response = new
            {
                memberId = member.Id,
                groupId = member.FamilyGroupId,
                memberName = user.DisplayName,
                groupName = group.Name,
                isAdmin = member.IsAdmin,
                email = user.Email,
                joinedAt = member.JoinedAt
            };

            return CreatedAtAction(nameof(GetMembers), new { groupId = member.FamilyGroupId }, response);
        }

        /// <summary>
        /// Get all members in a family group.
        /// Requires X-Member-Id header and caller must be a member of the group.
        /// </summary>
        [Microsoft.AspNetCore.Authorization.Authorize(AuthenticationSchemes = "MemberId")]
        [HttpGet("{groupId}")]
        public async Task<IActionResult> GetMembers(Guid groupId)
        {
            System.Diagnostics.Debug.WriteLine($"[GET MEMBERS] Called for groupId: {groupId}");

            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
            {
                System.Diagnostics.Debug.WriteLine("[GET MEMBERS] No valid memberId claim found");
                return Forbid();
            }

            System.Diagnostics.Debug.WriteLine($"[GET MEMBERS] Caller memberId: {memberId}");

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == groupId);
            if (!isMember)
            {
                System.Diagnostics.Debug.WriteLine($"[GET MEMBERS] Caller {memberId} is not a member of group {groupId}");
                return Forbid();
            }

            // Include User for each member so the navigation property is available
            var members = await _context.GroupMembers
                .Include(m => m.User)
                .Where(m => m.FamilyGroupId == groupId)
                .ToListAsync();

            System.Diagnostics.Debug.WriteLine($"[GET MEMBERS] Found {members.Count} members for group {groupId}");

            // Determine if any User navigation property is null
            var anyNullUsers = members.Any(m => m.User == null);
            System.Diagnostics.Debug.WriteLine($"[GET MEMBERS] Any null Users: {anyNullUsers}");

            // Warn about specific members with missing User for easier debugging
            foreach (var m in members.Where(m => m.User == null))
            {
                System.Diagnostics.Debug.WriteLine($"[GET MEMBERS] WARNING: GroupMember {m.Id} has null User (UserId: {m.UserId})");
            }

            // Project to the required DTO: memberId, userId, displayName
            var result = members.Select(m => new
            {
                memberId = m.Id,
                userId = m.UserId,
                displayName = m.User?.DisplayName ?? "Unknown User"
            }).ToList();

            System.Diagnostics.Debug.WriteLine($"[GET MEMBERS] Returning {result.Count} members");

            return Ok(result);
        }

        /// <summary>
        /// Find the GroupMember record for a given user in a specific family group.
        /// This endpoint does not require the X-Member-Id header because it is used
        /// by the client to resolve the member id when opening a group.
        /// </summary>
        [HttpGet("by-user/{groupId}/{userId}")]
        public async Task<IActionResult> GetMemberByUser(Guid groupId, Guid userId)
        {
            var member = await _context.GroupMembers
                .Include(m => m.User)
                .FirstOrDefaultAsync(m => m.UserId == userId && m.FamilyGroupId == groupId);

            if (member == null)
                return NotFound();

            return Ok(new
            {
                memberId = member.Id,
                displayName = member.User?.DisplayName,
                groupId = member.FamilyGroupId
            });
        }
    }
}
