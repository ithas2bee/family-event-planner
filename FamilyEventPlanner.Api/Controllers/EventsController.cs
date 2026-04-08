using FamilyEventPlanner.Api.Data;
using System;
using System.Linq;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Models.Responses;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EventsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EventsController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/events
        [HttpPost]
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

            // Get authenticated member id from claims
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == request.FamilyGroupId);
            if (!isMember)
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
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == familyGroupId);
            if (!isMember)
                return Forbid();

            pageNumber = Math.Max(1, pageNumber);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var events = await _context.FamilyEvents
                .Where(e => e.FamilyGroupId == familyGroupId)
                .OrderByDescending(e => e.StartDate)
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
                    CreatedAt = e.CreatedAt
                })
                .ToListAsync();

            return Ok(events);
        }
        // GET: api/events/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetEvent(Guid id)
        {
            var ev = await _context.FamilyEvents.FindAsync(id);
            if (ev == null)
                return NotFound(new { message = "Event not found." });

            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == ev.FamilyGroupId);
            if (!isMember)
                return Forbid();

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
