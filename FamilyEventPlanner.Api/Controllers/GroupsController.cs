using System;
using System.Linq;
using System.Threading.Tasks;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models.Responses;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GroupsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GroupsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/groups/my/{userId}
        [HttpGet("my/{userId}")]
        public async Task<IActionResult> GetMyGroups(Guid userId)
        {
            System.Diagnostics.Debug.WriteLine($"[GET MY GROUPS] Fetching groups for userId: {userId}");

            // Query GroupMembers for this user and include FamilyGroup
            var groups = await _context.GroupMembers
                .Where(gm => gm.UserId == userId)
                .Include(gm => gm.FamilyGroup)
                .Select(gm => new GroupSummaryResponse
                {
                    groupId = gm.FamilyGroupId,
                    groupName = gm.FamilyGroup.Name,
                    inviteCode = gm.FamilyGroup.InviteCode,
                    isAdmin = gm.IsAdmin
                })
                .ToListAsync();

            System.Diagnostics.Debug.WriteLine($"[GET MY GROUPS] Found {groups.Count} groups for user {userId}");

            return Ok(groups);
        }
    }
}
