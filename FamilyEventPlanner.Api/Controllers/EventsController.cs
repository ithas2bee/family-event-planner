using FamilyEventPlanner.Api.Data;
using System;
using System.Linq;
using System.Security.Claims;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Models.Responses;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FamilyEventPlanner.Api.Data;

namespace FamilyEventPlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Microsoft.AspNetCore.Authorization.Authorize(AuthenticationSchemes = "MemberId")]
    public class EventsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EventsController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/events
        /// <summary>
        /// Create a new family event. Authenticated member becomes the creator.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateEvent([FromBody] CreateEventRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var group = await _context.FamilyGroups.FindAsync(request.FamilyGroupId);
            if (group == null)
                return NotFound(new { message = "Family group not found." });

            // Get authenticated member id from claims (MemberId auth)
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            // Validate authenticated member belongs to this group and load User
            var member = await _context.GroupMembers
                .Include(m => m.User)
                .FirstOrDefaultAsync(m => m.Id == memberId && m.FamilyGroupId == request.FamilyGroupId);

            if (member == null)
                return Forbid();

            var ev = new FamilyEvent
            {
                Id = Guid.NewGuid(),
                FamilyGroupId = request.FamilyGroupId,
                Title = request.Title,
                Description = request.Description,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Location = request.Location,
                DressCode = request.DressCode,
                Notes = request.Notes,
                CreatedByMemberId = memberId,
                CreatedAt = DateTime.UtcNow
            };

            _context.FamilyEvents.Add(ev);
            await _context.SaveChangesAsync();

            _context.ActivityFeed.Add(new ActivityFeed
            {
                Id = Guid.NewGuid(),
                FamilyGroupId = ev.FamilyGroupId,
                ActorMemberId = memberId,
                ActivityType = "EventCreated",
                RelatedEntityId = ev.Id,
                RelatedEntityType = "Event",
                MetadataJson = $"{{\"title\":\"{ev.Title}\"}}",
                CreatedAtUtc = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            System.Diagnostics.Debug.WriteLine($"[CREATE EVENT] Event {ev.Id} created by member {memberId} in group {request.FamilyGroupId}");

            var response = new EventResponse
            {
                Id = ev.Id,
                FamilyGroupId = ev.FamilyGroupId,
                Title = ev.Title,
                Description = ev.Description,
                StartDate = ev.StartDate,
                EndDate = ev.EndDate,
                Location = ev.Location,
                DressCode = ev.DressCode,
                Notes = ev.Notes,
                CreatedByMemberId = ev.CreatedByMemberId,
                CreatorDisplayName = member.User?.DisplayName,
                CreatedAt = ev.CreatedAt
            };

            return CreatedAtAction(nameof(GetEvent), new { id = ev.Id }, response);
        }

        // GET: api/events/group/{familyGroupId}
        [HttpGet("group/{familyGroupId}")]
        public async Task<IActionResult> GetEventsForGroup(Guid familyGroupId, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
        {
            var group = await _context.FamilyGroups.FindAsync(familyGroupId);
            if (group == null)
                return NotFound(new { message = "Family group not found." });

            // Validate authenticated member is a member of this group
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == familyGroupId);
            if (!isMember)
                return Forbid();

            System.Diagnostics.Debug.WriteLine($"[GET EVENTS] Fetching events for group {familyGroupId}, requested by member {memberId}");

            pageNumber = Math.Max(1, pageNumber);
            pageSize = Math.Clamp(pageSize, 1, 100);

            // Join with GroupMembers and Users to get creator display name
            var events = await _context.FamilyEvents
                .Where(e => e.FamilyGroupId == familyGroupId)
                .OrderBy(e => e.StartDate)  // ? Changed to ascending (earliest first)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new EventResponse
                {
                    Id = e.Id,
                    FamilyGroupId = e.FamilyGroupId,
                    Title = e.Title,
                    Description = e.Description,
                    StartDate = e.StartDate,
                    EndDate = e.EndDate,
                    Location = e.Location,
                    DressCode = e.DressCode,
                    Notes = e.Notes,
                    CreatedByMemberId = e.CreatedByMemberId,
                    CreatorDisplayName = e.CreatedByMemberId != null
                        ? _context.GroupMembers
                            .Where(m => m.Id == e.CreatedByMemberId)
                            .Select(m => m.User.DisplayName)
                            .FirstOrDefault()
                        : null,
                    CreatedAt = e.CreatedAt
                })
                .ToListAsync();

            System.Diagnostics.Debug.WriteLine($"[GET EVENTS] Returning {events.Count} events for group {familyGroupId}");

            return Ok(events);
        }
        // GET: api/events/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetEvent(Guid id)
        {
            var ev = await _context.FamilyEvents.FindAsync(id);
            if (ev == null)
                return NotFound(new { message = "Event not found." });

            // Validate authenticated member is a member of this group
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == ev.FamilyGroupId);
            if (!isMember)
                return Forbid();

            // Get creator display name
            string creatorDisplayName = null;
            if (ev.CreatedByMemberId != null)
            {
                var creator = await _context.GroupMembers
                    .Include(m => m.User)
                    .FirstOrDefaultAsync(m => m.Id == ev.CreatedByMemberId);
                creatorDisplayName = creator?.User?.DisplayName;
            }

            var response = new EventResponse
            {
                Id = ev.Id,
                FamilyGroupId = ev.FamilyGroupId,
                Title = ev.Title,
                Description = ev.Description,
                StartDate = ev.StartDate,
                EndDate = ev.EndDate,
                Location = ev.Location,
                DressCode = ev.DressCode,
                Notes = ev.Notes,
                CreatedByMemberId = ev.CreatedByMemberId,
                CreatorDisplayName = creatorDisplayName,
                CreatedAt = ev.CreatedAt
            };

            return Ok(response);
        }
        // PUT: api/events/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEvent(Guid id, [FromBody] UpdateEventRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var ev = await _context.FamilyEvents.FindAsync(id);
            if (ev == null)
                return NotFound(new { message = "Event not found." });

            // Validate authenticated member is a member of this group
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == ev.FamilyGroupId);
            if (!isMember)
                return Forbid();

            // Apply updates
            ev.Title = request.Title;
            ev.Description = request.Description;
            ev.StartDate = request.StartDate;
            ev.EndDate = request.EndDate;
            ev.Location = request.Location;
            ev.DressCode = request.DressCode;
            ev.Notes = request.Notes;

            _context.FamilyEvents.Update(ev);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/events/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEvent(Guid id)
        {
            var ev = await _context.FamilyEvents.FindAsync(id);
            if (ev == null)
                return NotFound(new { message = "Event not found." });

            // Only allow deletion by event creator or a group admin
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var member = await _context.GroupMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.FamilyGroupId == ev.FamilyGroupId);
            if (member == null)
                return Forbid();

            if (ev.CreatedByMemberId != memberId && !member.IsAdmin)
                return Forbid();

            _context.FamilyEvents.Remove(ev);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
