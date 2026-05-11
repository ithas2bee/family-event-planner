using System;
using System.Linq;
using System.Threading.Tasks;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Models.Responses;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Microsoft.AspNetCore.Authorization.Authorize(AuthenticationSchemes = "MemberId")]
    public class KickbacksController : ControllerBase
    {
        private readonly AppDbContext _context;

        public KickbacksController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/kickbacks/group/{groupId}
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

            System.Diagnostics.Debug.WriteLine($"[GET KICKBACKS] Fetching kickbacks for group {groupId}, requested by member {memberId}");

            pageNumber = Math.Max(1, pageNumber);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var now = DateTime.UtcNow;

            // Get active kickbacks only (not expired and IsActive = true)
            var kickbacks = await _context.Kickbacks
                .Where(k => k.FamilyGroupId == groupId && k.IsActive && k.ExpiresAtUtc > now)
                .OrderByDescending(k => k.CreatedAtUtc)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new System.Collections.Generic.List<KickbackDto>();

            foreach (var kickback in kickbacks)
            {
                // Get creator display name
                string creatorDisplayName = null;
                if (kickback.CreatedByMemberId != null)
                {
                    var creator = await _context.GroupMembers
                        .Include(m => m.User)
                        .FirstOrDefaultAsync(m => m.Id == kickback.CreatedByMemberId);
                    creatorDisplayName = creator?.User?.DisplayName;
                }

                // Get response counts
                var responses = await _context.KickbackResponses
                    .Where(r => r.KickbackId == kickback.Id)
                    .ToListAsync();

                var pullingUpCount = responses.Count(r => r.ResponseType == "PullingUp");
                var maybeCount = responses.Count(r => r.ResponseType == "Maybe");

                // Get current member's response
                var memberResponse = responses.FirstOrDefault(r => r.MemberId == memberId);

                result.Add(new KickbackDto
                {
                    Id = kickback.Id,
                    FamilyGroupId = kickback.FamilyGroupId,
                    CreatedByMemberId = kickback.CreatedByMemberId,
                    CreatorDisplayName = creatorDisplayName,
                    Vibe = kickback.Vibe,
                    Note = kickback.Note,
                    ExpiresAtUtc = kickback.ExpiresAtUtc,
                    CreatedAtUtc = kickback.CreatedAtUtc,
                    IsActive = kickback.IsActive,
                    PullingUpCount = pullingUpCount,
                    MaybeCount = maybeCount,
                    CurrentMemberResponse = memberResponse?.ResponseType
                });
            }

            System.Diagnostics.Debug.WriteLine($"[GET KICKBACKS] Returning {result.Count} active kickbacks for group {groupId}");

            return Ok(result);
        }

        // POST: api/kickbacks
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateKickbackRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var group = await _context.FamilyGroups.FindAsync(request.FamilyGroupId);
            if (group == null)
                return NotFound(new { message = "FamilyGroup not found." });

            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var member = await _context.GroupMembers
                .Include(m => m.User)
                .FirstOrDefaultAsync(m => m.Id == memberId && m.FamilyGroupId == request.FamilyGroupId);

            if (member == null)
                return Forbid();

            var kickback = new Kickback
            {
                Id = Guid.NewGuid(),
                FamilyGroupId = request.FamilyGroupId,
                CreatedByMemberId = memberId,
                Vibe = request.Vibe,
                Note = request.Note,
                ExpiresAtUtc = request.ExpiresAtUtc,
                IsActive = true,
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.Kickbacks.Add(kickback);
            await _context.SaveChangesAsync();

            // Log activity
            _context.ActivityFeed.Add(new ActivityFeed
            {
                Id = Guid.NewGuid(),
                FamilyGroupId = kickback.FamilyGroupId,
                ActorMemberId = memberId,
                ActivityType = "KickbackCreated",
                RelatedEntityId = kickback.Id,
                RelatedEntityType = "Kickback",
                MetadataJson = $"{{\"vibe\":\"{kickback.Vibe}\"}}",
                CreatedAtUtc = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            System.Diagnostics.Debug.WriteLine($"[CREATE KICKBACK] Kickback {kickback.Id} created by member {memberId} in group {request.FamilyGroupId}");

            var response = new KickbackDto
            {
                Id = kickback.Id,
                FamilyGroupId = kickback.FamilyGroupId,
                CreatedByMemberId = kickback.CreatedByMemberId,
                CreatorDisplayName = member.User?.DisplayName,
                Vibe = kickback.Vibe,
                Note = kickback.Note,
                ExpiresAtUtc = kickback.ExpiresAtUtc,
                CreatedAtUtc = kickback.CreatedAtUtc,
                IsActive = kickback.IsActive,
                PullingUpCount = 0,
                MaybeCount = 0,
                CurrentMemberResponse = null
            };

            return CreatedAtAction(nameof(GetForGroup), new { groupId = kickback.FamilyGroupId }, response);
        }

        // POST: api/kickbacks/respond
        [HttpPost("respond")]
        public async Task<IActionResult> Respond([FromBody] RespondToKickbackRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Validate response type
            if (request.ResponseType != "PullingUp" && request.ResponseType != "Maybe")
                return BadRequest(new { message = "ResponseType must be 'PullingUp' or 'Maybe'." });

            var kickback = await _context.Kickbacks.FindAsync(request.KickbackId);
            if (kickback == null)
                return NotFound(new { message = "Kickback not found." });

            // Check if kickback is still active
            if (!kickback.IsActive || kickback.ExpiresAtUtc <= DateTime.UtcNow)
                return BadRequest(new { message = "This kickback is no longer active." });

            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == kickback.FamilyGroupId);
            if (!isMember)
                return Forbid();

            // Check if member already responded
            var existingResponse = await _context.KickbackResponses
                .FirstOrDefaultAsync(r => r.KickbackId == request.KickbackId && r.MemberId == memberId);

            if (existingResponse != null)
            {
                // Update existing response
                existingResponse.ResponseType = request.ResponseType;
                existingResponse.CreatedAtUtc = DateTime.UtcNow;
                _context.KickbackResponses.Update(existingResponse);
            }
            else
            {
                // Create new response
                var response = new KickbackResponse
                {
                    Id = Guid.NewGuid(),
                    KickbackId = request.KickbackId,
                    MemberId = memberId,
                    ResponseType = request.ResponseType,
                    CreatedAtUtc = DateTime.UtcNow
                };
                _context.KickbackResponses.Add(response);
            }

            await _context.SaveChangesAsync();

            // Log activity
            _context.ActivityFeed.Add(new ActivityFeed
            {
                Id = Guid.NewGuid(),
                FamilyGroupId = kickback.FamilyGroupId,
                ActorMemberId = memberId,
                ActivityType = "KickbackResponseUpdated",
                RelatedEntityId = kickback.Id,
                RelatedEntityType = "Kickback",
                MetadataJson = $"{{\"vibe\":\"{kickback.Vibe}\",\"responseType\":\"{request.ResponseType}\"}}",
                CreatedAtUtc = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            System.Diagnostics.Debug.WriteLine($"[KICKBACK RESPONSE] Member {memberId} responded '{request.ResponseType}' to kickback {request.KickbackId}");

            return Ok(new { kickbackId = request.KickbackId, memberId, responseType = request.ResponseType });
        }
    }
}
