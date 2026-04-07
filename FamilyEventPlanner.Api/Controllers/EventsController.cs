using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EventsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EventsController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/events
        [HttpPost]
        public async Task<IActionResult> CreateEvent([FromBody] CreateEventRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var group = await _context.FamilyGroups.FindAsync(request.FamilyGroupId);
            if (group == null)
                return NotFound(new { message = "Family group not found." });

            // Verify the creator is a member of the family group
            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == request.CreatedByMemberId && m.FamilyGroupId == request.FamilyGroupId);
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
                CreatedByMemberId = request.CreatedByMemberId,
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

        // GET: api/events/group/{familyGroupId}?memberId={memberId}
        [HttpGet("group/{familyGroupId}")]
        public async Task<IActionResult> GetEventsForGroup(Guid familyGroupId, [FromQuery] Guid memberId)
        {
            var group = await _context.FamilyGroups.FindAsync(familyGroupId);
            if (group == null)
                return NotFound(new { message = "Family group not found." });

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == familyGroupId);
            if (!isMember)
                return Forbid();

            var events = await _context.FamilyEvents
                .Where(e => e.FamilyGroupId == familyGroupId)
                .OrderByDescending(e => e.StartDate)
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

        // GET: api/events/{id}?memberId={memberId}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetEvent(Guid id, [FromQuery] Guid memberId)
        {
            var ev = await _context.FamilyEvents.FindAsync(id);
            if (ev == null)
                return NotFound(new { message = "Event not found." });

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

        // PUT: api/events/{id}?memberId={memberId}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEvent(Guid id, [FromQuery] Guid memberId, [FromBody] UpdateEventRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var ev = await _context.FamilyEvents.FindAsync(id);
            if (ev == null)
                return NotFound(new { message = "Event not found." });

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

        // DELETE: api/events/{id}?memberId={memberId}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEvent(Guid id, [FromQuery] Guid memberId)
        {
            var ev = await _context.FamilyEvents.FindAsync(id);
            if (ev == null)
                return NotFound(new { message = "Event not found." });

            // Only allow deletion by event creator or a group admin
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
