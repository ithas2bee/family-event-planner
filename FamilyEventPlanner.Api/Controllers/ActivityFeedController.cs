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
    [Route("api/activity")]
    [Microsoft.AspNetCore.Authorization.Authorize(AuthenticationSchemes = "MemberId")]
    public class ActivityFeedController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ActivityFeedController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/activity/group/{groupId}
        [HttpGet("group/{groupId}")]
        public async Task<IActionResult> GetForGroup(Guid groupId, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
        {
            var group = await _context.FamilyGroups.FindAsync(groupId);
            if (group == null)
                return NotFound(new { message = "FamilyGroup not found." });

            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == groupId);
            if (!isMember)
                return Forbid();

            System.Diagnostics.Debug.WriteLine($"[GET ACTIVITY] Fetching activity for group {groupId}, requested by member {memberId}");

            pageNumber = Math.Max(1, pageNumber);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var activities = await _context.ActivityFeed
                .Where(a => a.FamilyGroupId == groupId)
                .OrderByDescending(a => a.CreatedAtUtc)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new ActivityFeedResponse
                {
                    Id = a.Id,
                    FamilyGroupId = a.FamilyGroupId,
                    ActorMemberId = a.ActorMemberId,
                    ActorDisplayName = a.ActorMember != null ? a.ActorMember.User.DisplayName : null,
                    ActivityType = a.ActivityType,
                    RelatedEntityId = a.RelatedEntityId,
                    RelatedEntityType = a.RelatedEntityType,
                    MetadataJson = a.MetadataJson,
                    CreatedAtUtc = a.CreatedAtUtc
                })
                .ToListAsync();

            System.Diagnostics.Debug.WriteLine($"[GET ACTIVITY] Returning {activities.Count} activities for group {groupId}");

            return Ok(activities);
        }
    }
}
