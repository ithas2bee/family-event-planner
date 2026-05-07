using Microsoft.AspNetCore.Mvc;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Data;
using Microsoft.EntityFrameworkCore;

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
                Name = request.Name,
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
                .Select(m => new
                {
                    groupId = m.FamilyGroupId,
                    groupName = m.FamilyGroup.Name,
                    isAdmin = m.IsAdmin,
                    memberId = m.Id,
                    joinedAt = m.JoinedAt
                })
                .ToListAsync();

            return Ok(groups);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetGroup(Guid id)
        {
            var g = await _context.FamilyGroups.FindAsync(id);
            if (g == null)
                return NotFound();
            return Ok(g);
        }

        // Note: Removed public GetGroups() endpoint.
        // Returning all groups without authentication is a security risk.
        // To add back: require [Authorize] and only return groups where caller is a member.

        private string GenerateInviteCode()
        {
            return Guid.NewGuid().ToString().Substring(0, 6).ToUpper();
        }
    }
}
