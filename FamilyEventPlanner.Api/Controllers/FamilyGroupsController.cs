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
        public async Task<IActionResult> CreateGroup([FromBody] FamilyGroup group)
        {
            group.Id = Guid.NewGuid();
            group.CreatedAt = DateTime.UtcNow;
            group.InviteCode = GenerateInviteCode();

            _context.FamilyGroups.Add(group);
            await _context.SaveChangesAsync();

            return Ok(group);
        }

        [HttpGet]
        public async Task<IActionResult> GetGroups()
        {
            var groups = await _context.FamilyGroups.ToListAsync();
            return Ok(groups);
        }

        private string GenerateInviteCode()
        {
            return Guid.NewGuid().ToString().Substring(0, 6).ToUpper();
        }
    }
}
