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
                return BadRequest("You are already in this group.");

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
        [Microsoft.AspNetCore.Authorization.Authorize]
        [HttpGet("{groupId}")]
        public async Task<IActionResult> GetMembers(Guid groupId)
        {
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == groupId);
            if (!isMember)
                return Forbid();

            // Include User for each member
            var members = await _context.GroupMembers
                .Include(m => m.User)
                .Where(m => m.FamilyGroupId == groupId)
                .ToListAsync();

            var result = members.Select(m => new
            {
                memberId = m.Id,
                groupId = m.FamilyGroupId,
                memberName = m.User.DisplayName,
                groupName = m.FamilyGroup.Name,
                isAdmin = m.IsAdmin,
                email = m.User.Email,
                joinedAt = m.JoinedAt
            });

            return Ok(result);
        }
    }
}
