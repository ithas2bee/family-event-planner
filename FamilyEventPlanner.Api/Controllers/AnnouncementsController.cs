using System;
using System.Linq;
using System.Security.Claims;
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
    public class AnnouncementsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AnnouncementsController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/announcements
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAnnouncementRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var validDurations = new[] { 1, 6, 24, 72, 168 };
            if (request.DurationHours.HasValue && !validDurations.Contains(request.DurationHours.Value))
                return BadRequest(new { message = "Announcement expiration is not supported." });

            var group = await _context.FamilyGroups.FindAsync(request.FamilyGroupId);
            if (group == null)
                return NotFound(new { message = "FamilyGroup not found." });

            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            // Load member with User to get display name
            var member = await _context.GroupMembers
                .Include(m => m.User)
                .FirstOrDefaultAsync(m => m.Id == memberId && m.FamilyGroupId == request.FamilyGroupId);

            if (member == null)
                return Forbid();

            var now = DateTime.UtcNow;
            var requestedExpiresAt = request.ExpiresAt.HasValue
                ? request.ExpiresAt.Value.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(request.ExpiresAt.Value, DateTimeKind.Utc)
                    : request.ExpiresAt.Value.ToUniversalTime()
                : (DateTime?)null;
            if (!request.DurationHours.HasValue &&
                requestedExpiresAt.HasValue &&
                (requestedExpiresAt.Value <= now || requestedExpiresAt.Value > now.AddDays(14)))
            {
                return BadRequest(new { message = "Announcement expiration must be in the next 14 days." });
            }

            var ann = new Announcement
            {
                Id = Guid.NewGuid(),
                FamilyGroupId = request.FamilyGroupId,
                Title = request.Title,
                Body = request.Body,
                CreatedByMemberId = memberId,
                CreatedAt = now,
                ExpiresAt = request.DurationHours.HasValue
                    ? now.AddHours(request.DurationHours.Value)
                    : requestedExpiresAt ?? now.AddDays(14)
            };

            _context.Announcements.Add(ann);
            await _context.SaveChangesAsync();

            _context.ActivityFeed.Add(new ActivityFeed
            {
                Id = Guid.NewGuid(),
                FamilyGroupId = ann.FamilyGroupId,
                ActorMemberId = memberId,
                ActivityType = "AnnouncementCreated",
                RelatedEntityId = ann.Id,
                RelatedEntityType = "Announcement",
                MetadataJson = $"{{\"title\":\"{ann.Title}\"}}",
                CreatedAtUtc = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            System.Diagnostics.Debug.WriteLine($"[CREATE ANNOUNCEMENT] Announcement {ann.Id} created by member {memberId} in group {request.FamilyGroupId}");

            var resp = new AnnouncementResponse
            {
                Id = ann.Id,
                FamilyGroupId = ann.FamilyGroupId,
                Title = ann.Title,
                Body = ann.Body,
                CreatedByMemberId = ann.CreatedByMemberId,
                CreatorDisplayName = member.User?.DisplayName,
                CreatedAt = ann.CreatedAt,
                ExpiresAt = ann.ExpiresAt
            };

            return CreatedAtAction(nameof(GetById), new { id = ann.Id }, resp);
        }

        // GET: api/announcements/group/{familyGroupId}
        [HttpGet("group/{familyGroupId}")]
        public async Task<IActionResult> GetForGroup(Guid familyGroupId, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
        {
            var group = await _context.FamilyGroups.FindAsync(familyGroupId);
            if (group == null)
                return NotFound(new { message = "FamilyGroup not found." });
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == familyGroupId);
            if (!isMember)
                return Forbid();

            System.Diagnostics.Debug.WriteLine($"[GET ANNOUNCEMENTS] Fetching announcements for group {familyGroupId}, requested by member {memberId}");

            pageNumber = Math.Max(1, pageNumber);
            pageSize = Math.Clamp(pageSize, 1, 100);

            // Join with GroupMembers and Users to get creator display name
            var list = await _context.Announcements
                .Where(a => a.FamilyGroupId == familyGroupId &&
                    a.ExpiresAt.HasValue && a.ExpiresAt.Value > DateTime.UtcNow)
                .OrderByDescending(a => a.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new AnnouncementResponse
                {
                    Id = a.Id,
                    FamilyGroupId = a.FamilyGroupId,
                    Title = a.Title,
                    Body = a.Body,
                    CreatedByMemberId = a.CreatedByMemberId,
                    CreatorDisplayName = a.CreatedByMemberId != null
                        ? _context.GroupMembers
                            .Where(m => m.Id == a.CreatedByMemberId)
                            .Select(m => m.User.DisplayName)
                            .FirstOrDefault()
                        : null,
                    CreatedAt = a.CreatedAt,
                    ExpiresAt = a.ExpiresAt
                })
                .ToListAsync();

            System.Diagnostics.Debug.WriteLine($"[GET ANNOUNCEMENTS] Returning {list.Count} announcements for group {familyGroupId}");

            return Ok(list);
        }

        // GET: api/announcements/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var ann = await _context.Announcements
                .Include(a => a.FamilyGroup)
                .FirstOrDefaultAsync(a => a.Id == id && a.ExpiresAt.HasValue && a.ExpiresAt.Value > DateTime.UtcNow);
            if (ann == null)
                return NotFound(new { message = "Announcement not found." });
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == ann.FamilyGroupId);
            if (!isMember)
                return Forbid();

            // Get creator display name
            string creatorDisplayName = null;
            if (ann.CreatedByMemberId != null)
            {
                var creator = await _context.GroupMembers
                    .Include(m => m.User)
                    .FirstOrDefaultAsync(m => m.Id == ann.CreatedByMemberId);
                creatorDisplayName = creator?.User?.DisplayName;
            }

            var resp = new AnnouncementResponse
            {
                Id = ann.Id,
                FamilyGroupId = ann.FamilyGroupId,
                Title = ann.Title,
                Body = ann.Body,
                CreatedByMemberId = ann.CreatedByMemberId,
                CreatorDisplayName = creatorDisplayName,
                CreatedAt = ann.CreatedAt,
                ExpiresAt = ann.ExpiresAt
            };

            return Ok(resp);
        }

        // PUT: api/announcements/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAnnouncementRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var ann = await _context.Announcements.FirstOrDefaultAsync(a =>
                a.Id == id && a.ExpiresAt.HasValue && a.ExpiresAt.Value > DateTime.UtcNow);
            if (ann == null)
                return NotFound(new { message = "Announcement not found." });

            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var member = await _context.GroupMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.FamilyGroupId == ann.FamilyGroupId);
            if (member == null)
                return Forbid();

            // Only creator or admin can update
            if (ann.CreatedByMemberId.HasValue && ann.CreatedByMemberId != memberId && !member.IsAdmin)
                return Forbid();

            ann.Title = request.Title;
            ann.Body = request.Body;
            if (request.ExpiresAt.HasValue)
            {
                var expiresAt = request.ExpiresAt.Value.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(request.ExpiresAt.Value, DateTimeKind.Utc)
                    : request.ExpiresAt.Value.ToUniversalTime();
                if (!ann.ExpiresAt.HasValue || expiresAt <= DateTime.UtcNow || expiresAt > ann.ExpiresAt.Value)
                    return BadRequest(new { message = "Expiration can only be extended through its expiration notification." });
                ann.ExpiresAt = expiresAt;
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost("{id}/extend")]
        public async Task<IActionResult> ExtendExpiration(Guid id)
        {
            var announcement = await _context.Announcements.FirstOrDefaultAsync(a => a.Id == id);
            if (announcement == null)
                return NotFound(new { message = "Announcement not found." });

            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();
            if (announcement.CreatedByMemberId != memberId)
                return Forbid();
            if (!announcement.ExpiresAt.HasValue || announcement.ExpiresAt.Value <= DateTime.UtcNow)
                return BadRequest(new { message = "This announcement has expired." });
            if (!announcement.ExpirationNotificationSent)
                return BadRequest(new { message = "The expiration notification has not been sent." });
            if (announcement.ExpirationExtended)
                return Conflict(new { message = "This announcement has already been extended." });

            announcement.ExpiresAt = announcement.ExpiresAt.Value.AddHours(48);
            announcement.ExpirationExtended = true;
            var notification = await _context.Notifications.FirstOrDefaultAsync(n =>
                n.MemberId == memberId &&
                n.Type == "AnnouncementExpiring" &&
                n.Link == $"/announcement/{announcement.Id}");
            if (notification != null)
            {
                notification.Type = "AnnouncementExpirationExtended";
                notification.Message = $"Your announcement \"{announcement.Title}\" was extended by 48 hours.";
            }
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This announcement has already been extended." });
            }

            return Ok(new { announcement.ExpiresAt });
        }

        // DELETE: api/announcements/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var ann = await _context.Announcements.FirstOrDefaultAsync(a => a.Id == id);
            if (ann == null)
                return NotFound(new { message = "Announcement not found." });

            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var member = await _context.GroupMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.FamilyGroupId == ann.FamilyGroupId);
            if (member == null)
                return Forbid();

            // Only creator or admin can delete
            if (ann.CreatedByMemberId.HasValue && ann.CreatedByMemberId != memberId && !member.IsAdmin)
                return Forbid();

            _context.ActivityFeed.RemoveRange(await _context.ActivityFeed
                .Where(activity => activity.RelatedEntityType == "Announcement" && activity.RelatedEntityId == ann.Id)
                .ToListAsync());
            _context.Notifications.RemoveRange(await _context.Notifications
                .Where(notification => notification.Link == $"/announcement/{ann.Id}")
                .ToListAsync());
            _context.Announcements.Remove(ann);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
