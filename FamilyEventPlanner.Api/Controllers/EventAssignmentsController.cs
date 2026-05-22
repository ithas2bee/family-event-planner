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
    [Microsoft.AspNetCore.Authorization.Authorize]
    public class EventAssignmentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EventAssignmentsController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/eventassignments
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAssignmentRequest request)
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

            // Resolve AssignedToId - use provided member or fallback to Unknown Guest
            Guid resolvedMemberId;
            if (request.AssignedToId.HasValue)
            {
                var assignedOk = await _context.GroupMembers.AnyAsync(m => m.Id == request.AssignedToId.Value && m.FamilyGroupId == ev.FamilyGroupId);
                if (!assignedOk)
                    return BadRequest(new { message = "AssignedTo member does not belong to the event's family group." });
                resolvedMemberId = request.AssignedToId.Value;
            }
            else
            {
                // Get Unknown Guest member for this group
                var unknownGuest = await _context.GroupMembers
                    .FirstOrDefaultAsync(m => m.FamilyGroupId == ev.FamilyGroupId && 
                                            m.User.Id == FamilyEventPlanner.Api.Constants.SystemConstants.UnknownGuestUserId);
                if (unknownGuest == null)
                    return BadRequest(new { message = "Unknown Guest member not found for this group." });
                resolvedMemberId = unknownGuest.Id;
            }

            var assignment = new EventAssignment
            {
                Id = Guid.NewGuid(),
                FamilyEventId = request.FamilyEventId,
                Title = request.Title,
                Description = request.Description,
                QuantityNeeded = request.QuantityNeeded,
                AssignedToId = resolvedMemberId,
                Category = request.Category
            };

            _context.EventAssignments.Add(assignment);
            await _context.SaveChangesAsync();

            var resp = new AssignmentResponse
            {
                Id = assignment.Id,
                FamilyEventId = assignment.FamilyEventId,
                Title = assignment.Title,
                Description = assignment.Description,
                QuantityNeeded = assignment.QuantityNeeded,
                AssignedToId = assignment.AssignedToId,
                Status = (int)assignment.Status,
                Category = (int)assignment.Category
            };

            return CreatedAtAction(nameof(GetById), new { id = assignment.Id }, resp);
        }

        // GET: api/eventassignments/event/{familyEventId}?memberId={memberId}
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

            var list = await _context.EventAssignments
                .Where(a => a.FamilyEventId == familyEventId)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new AssignmentResponse
                {
                    Id = a.Id,
                    FamilyEventId = a.FamilyEventId,
                    Title = a.Title,
                    Description = a.Description,
                    QuantityNeeded = a.QuantityNeeded,
                    AssignedToId = a.AssignedToId,
                    Status = (int)a.Status,
                    Category = (int)a.Category
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/eventassignments/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var assignment = await _context.EventAssignments.Include(a => a.FamilyEvent).FirstOrDefaultAsync(a => a.Id == id);
            if (assignment == null)
                return NotFound(new { message = "Assignment not found." });
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == assignment.FamilyEvent.FamilyGroupId);
            if (!isMember)
                return Forbid();

            var resp = new AssignmentResponse
            {
                Id = assignment.Id,
                FamilyEventId = assignment.FamilyEventId,
                Title = assignment.Title,
                Description = assignment.Description,
                QuantityNeeded = assignment.QuantityNeeded,
                AssignedToId = assignment.AssignedToId,
                Status = (int)assignment.Status,
                Category = (int)assignment.Category
            };

            return Ok(resp);
        }

        // PUT: api/eventassignments/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAssignmentRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var assignment = await _context.EventAssignments.Include(a => a.FamilyEvent).FirstOrDefaultAsync(a => a.Id == id);
            if (assignment == null)
                return NotFound(new { message = "Assignment not found." });

            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == assignment.FamilyEvent.FamilyGroupId);
            if (!isMember)
                return Forbid();

            // Only assigned member or group admin can update assignment (skip check for Unknown Guest)
            var assignedMember = await _context.GroupMembers
                .Include(m => m.User)
                .FirstOrDefaultAsync(m => m.Id == assignment.AssignedToId);

            if (assignedMember != null && !assignedMember.IsUnknownGuest() && assignment.AssignedToId != memberId)
            {
                var member = await _context.GroupMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.FamilyGroupId == assignment.FamilyEvent.FamilyGroupId);
                if (member == null || !member.IsAdmin)
                    return Forbid();
            }

            // Resolve AssignedToId if updating
            Guid? resolvedMemberId = null;
            if (request.AssignedToId.HasValue)
            {
                var assignedOk = await _context.GroupMembers.AnyAsync(m => m.Id == request.AssignedToId.Value && m.FamilyGroupId == assignment.FamilyEvent.FamilyGroupId);
                if (!assignedOk)
                    return BadRequest(new { message = "AssignedTo member does not belong to the event's family group." });
                resolvedMemberId = request.AssignedToId.Value;
            }
            else
            {
                // Use Unknown Guest if no memberId provided
                var unknownGuest = await _context.GroupMembers
                    .FirstOrDefaultAsync(m => m.FamilyGroupId == assignment.FamilyEvent.FamilyGroupId && 
                                            m.User.Id == FamilyEventPlanner.Api.Constants.SystemConstants.UnknownGuestUserId);
                if (unknownGuest != null)
                    resolvedMemberId = unknownGuest.Id;
            }

            assignment.Title = request.Title;
            assignment.Description = request.Description;
            assignment.QuantityNeeded = request.QuantityNeeded;
            if (resolvedMemberId.HasValue)
                assignment.AssignedToId = resolvedMemberId.Value;
            assignment.Status = request.Status;
            assignment.Category = request.Category;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/eventassignments/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var assignment = await _context.EventAssignments.Include(a => a.FamilyEvent).FirstOrDefaultAsync(a => a.Id == id);
            if (assignment == null)
                return NotFound(new { message = "Assignment not found." });

            // Only group admin can delete assignments
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var member = await _context.GroupMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.FamilyGroupId == assignment.FamilyEvent.FamilyGroupId);
            if (member == null || !member.IsAdmin)
                return Forbid();

            _context.EventAssignments.Remove(assignment);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
