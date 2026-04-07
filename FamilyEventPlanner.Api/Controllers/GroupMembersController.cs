using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

        [HttpPost("join")]
        public async Task<IActionResult> JoinGroup([FromBody] JoinGroupRequest request)
        {
            var group = await _context.FamilyGroups
                .FirstOrDefaultAsync(g => g.InviteCode == request.InviteCode);

            if (group == null)
            {
                return NotFound("Invalid invite code.");
            }

            var existingMember = await _context.GroupMembers.FirstOrDefaultAsync(m =>
                m.FamilyGroupId == group.Id &&
                m.Email == request.Email);

            if (existingMember != null)
            {
                return BadRequest("You are already in this group.");
            }

            var member = new GroupMember
            {
                Id = Guid.NewGuid(),
                FamilyGroupId = group.Id,
                Name = request.Name,
                Email = request.Email,
                IsAdmin = false,
                JoinedAt = DateTime.UtcNow
            };

            _context.GroupMembers.Add(member);
            await _context.SaveChangesAsync();

            return Ok(member);
        }

        [HttpGet("{groupId}")]
        public async Task<IActionResult> GetMembers(Guid groupId)
        {
            var members = await _context.GroupMembers
                .Where(m => m.FamilyGroupId == groupId)
                .ToListAsync();

            return Ok(members);
        }
    }
}
