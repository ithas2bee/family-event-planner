using FamilyEventPlanner.Api.Data;
using System;
using System.Linq;
using System.Threading.Tasks;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public class EventAttendanceController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EventAttendanceController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/eventattendance
        /// <summary>
        /// Create attendance (RSVP) for the authenticated member.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAttendanceRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var ev = await _context.FamilyEvents.FindAsync(request.FamilyEventId);
            if (ev == null)
                return NotFound(new { message = "Event not found." });

            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == ev.FamilyGroupId);
            if (!isMember)
                return Forbid();

            var attendance = new EventAttendance
            {
                Id = Guid.NewGuid(),
                FamilyEventId = request.FamilyEventId,
                MemberId = memberId,
                Rsvp = request.Rsvp,
                ArrivalTime = request.ArrivalTime,
                DepartureTime = request.DepartureTime,
                GuestCount = request.GuestCount,
                Notes = request.Notes
            };

            _context.EventAttendances.Add(attendance);
            await _context.SaveChangesAsync();

            var response = new Models.Responses.AttendanceResponse
            {
                Id = attendance.Id,
                FamilyEventId = attendance.FamilyEventId,
                MemberId = attendance.MemberId,
                Rsvp = (int)attendance.Rsvp,
                ArrivalTime = attendance.ArrivalTime,
                DepartureTime = attendance.DepartureTime,
                GuestCount = attendance.GuestCount,
                Notes = attendance.Notes
            };

            return CreatedAtAction(nameof(GetById), new { id = attendance.Id }, response);
        }

        // GET: api/eventattendance/event/{familyEventId}?memberId={memberId}
        [HttpGet("event/{familyEventId}")]
        public async Task<IActionResult> GetForEvent(Guid familyEventId, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20)
        {
            var ev = await _context.FamilyEvents.FindAsync(familyEventId);
            if (ev == null)
                return NotFound(new { message = "Event not found." });
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == ev.FamilyGroupId);
            if (!isMember)
                return Forbid();

            pageNumber = Math.Max(1, pageNumber);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var list = await _context.EventAttendances
                .Where(a => a.FamilyEventId == familyEventId)
                .OrderBy(a => a.MemberId)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new Models.Responses.AttendanceResponse
                {
                    Id = a.Id,
                    FamilyEventId = a.FamilyEventId,
                    MemberId = a.MemberId,
                    Rsvp = (int)a.Rsvp,
                    ArrivalTime = a.ArrivalTime,
                    DepartureTime = a.DepartureTime,
                    GuestCount = a.GuestCount,
                    Notes = a.Notes
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/eventattendance/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var att = await _context.EventAttendances.Include(a => a.FamilyEvent).FirstOrDefaultAsync(a => a.Id == id);
            if (att == null)
                return NotFound(new { message = "Attendance not found." });
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == att.FamilyEvent.FamilyGroupId);
            if (!isMember)
                return Forbid();

            var response = new Models.Responses.AttendanceResponse
            {
                Id = att.Id,
                FamilyEventId = att.FamilyEventId,
                MemberId = att.MemberId,
                Rsvp = (int)att.Rsvp,
                ArrivalTime = att.ArrivalTime,
                DepartureTime = att.DepartureTime,
                GuestCount = att.GuestCount,
                Notes = att.Notes
            };

            return Ok(response);
        }

        // PUT: api/eventattendance/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAttendanceRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var att = await _context.EventAttendances.Include(a => a.FamilyEvent).FirstOrDefaultAsync(a => a.Id == id);
            if (att == null)
                return NotFound(new { message = "Attendance not found." });
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == att.FamilyEvent.FamilyGroupId);
            if (!isMember)
                return Forbid();

            // Only the attendee themselves or a group admin can update
            if (att.MemberId != memberId)
            {
                var member = await _context.GroupMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.FamilyGroupId == att.FamilyEvent.FamilyGroupId);
                if (member == null || !member.IsAdmin)
                    return Forbid();
            }

            att.Rsvp = request.Rsvp;
            att.ArrivalTime = request.ArrivalTime;
            att.DepartureTime = request.DepartureTime;
            att.GuestCount = request.GuestCount;
            att.Notes = request.Notes;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/eventattendance/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var att = await _context.EventAttendances.Include(a => a.FamilyEvent).FirstOrDefaultAsync(a => a.Id == id);
            if (att == null)
                return NotFound(new { message = "Attendance not found." });
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            // Only the attendee or a group admin can delete
            if (att.MemberId != memberId)
            {
                var member = await _context.GroupMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.FamilyGroupId == att.FamilyEvent.FamilyGroupId);
                if (member == null || !member.IsAdmin)
                    return Forbid();
            }

            _context.EventAttendances.Remove(att);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
