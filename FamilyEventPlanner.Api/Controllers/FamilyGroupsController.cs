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
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetGroup), new { id = group.Id }, group);
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
