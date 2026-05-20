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
                CreatedAt = ev.CreatedAt,
                Assignments = new List<SimpleAssignmentResponse>()
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
                .Include(e => e.Assignments)
                .OrderBy(e => e.StartDate)  // ? Changed to ascending (earliest first)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = events.Select(e => new EventResponse
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
                CreatedAt = e.CreatedAt,
                Assignments = e.Assignments.Select(a => new SimpleAssignmentResponse
                {
                    MemberName = a.Description ?? string.Empty,
                    Task = a.Title ?? string.Empty
                }).ToList()
            }).ToList();

            System.Diagnostics.Debug.WriteLine($"[GET EVENTS] Returning {result.Count} events for group {familyGroupId}");

            return Ok(result);
        }
        // GET: api/events/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetEvent(Guid id)
        {
            System.Diagnostics.Debug.WriteLine("========================================");
            System.Diagnostics.Debug.WriteLine($"[GET EVENT] GET /api/events/{id} STARTED");

            var ev = await _context.FamilyEvents
                .Include(e => e.Assignments)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (ev == null)
            {
                System.Diagnostics.Debug.WriteLine("[GET EVENT] Event NOT FOUND");
                return NotFound(new { message = "Event not found." });
            }

            System.Diagnostics.Debug.WriteLine($"[GET EVENT] Event FOUND: {ev.Title}");
            System.Diagnostics.Debug.WriteLine($"[GET EVENT] Assignments in DB: {ev.Assignments.Count}");
            foreach (var a in ev.Assignments)
            {
                System.Diagnostics.Debug.WriteLine($"[GET EVENT]   DB Assignment: Id={a.Id}, Title='{a.Title}', Description='{a.Description}'");
            }

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
                CreatedAt = ev.CreatedAt,
                Assignments = ev.Assignments.Select(a => new SimpleAssignmentResponse
                {
                    MemberName = a.Description ?? string.Empty,
                    Task = a.Title ?? string.Empty
                }).ToList()
            };

            System.Diagnostics.Debug.WriteLine($"[GET EVENT] RESPONSE OBJECT - Assignments: {response.Assignments?.Count ?? 0}");
            if (response.Assignments != null)
            {
                foreach (var a in response.Assignments)
                {
                    System.Diagnostics.Debug.WriteLine($"[GET EVENT]   Response Assignment: MemberName='{a.MemberName}', Task='{a.Task}'");
                }
            }

            var jsonResponse = System.Text.Json.JsonSerializer.Serialize(response, new System.Text.Json.JsonSerializerOptions 
            { 
                PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                WriteIndented = true 
            });
            System.Diagnostics.Debug.WriteLine("[GET EVENT] RAW JSON RESPONSE:");
            System.Diagnostics.Debug.WriteLine(jsonResponse);
            System.Diagnostics.Debug.WriteLine("========================================");

            return Ok(response);
        }
        // PUT: api/events/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEvent(Guid id, [FromBody] UpdateEventRequest request)
        {
            System.Diagnostics.Debug.WriteLine("========================================");
            System.Diagnostics.Debug.WriteLine($"[UPDATE EVENT] PUT /api/events/{id} STARTED");
            System.Diagnostics.Debug.WriteLine($"[UPDATE EVENT] Request Title: {request.Title}");
            System.Diagnostics.Debug.WriteLine($"[UPDATE EVENT] Request Assignments Count: {request.Assignments?.Count ?? 0}");
            if (request.Assignments != null)
            {
                foreach (var a in request.Assignments)
                {
                    System.Diagnostics.Debug.WriteLine($"[UPDATE EVENT]   Incoming Assignment: MemberName='{a.MemberName}', Task='{a.Task}'");
                }
            }

            if (!ModelState.IsValid)
            {
                System.Diagnostics.Debug.WriteLine("[UPDATE EVENT] ModelState INVALID");
                return BadRequest(ModelState);
            }

            var ev = await _context.FamilyEvents
                .Include(e => e.Assignments)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (ev == null)
            {
                System.Diagnostics.Debug.WriteLine("[UPDATE EVENT] Event NOT FOUND");
                return NotFound(new { message = "Event not found." });
            }

            System.Diagnostics.Debug.WriteLine($"[UPDATE EVENT] Event FOUND: {ev.Title}");
            System.Diagnostics.Debug.WriteLine($"[UPDATE EVENT] BEFORE UPDATE - Existing Assignments: {ev.Assignments.Count}");
            foreach (var a in ev.Assignments)
            {
                System.Diagnostics.Debug.WriteLine($"[UPDATE EVENT]   Existing: Title='{a.Title}', Description='{a.Description}'");
            }

            // Validate authenticated member is a member of this group
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == ev.FamilyGroupId);
            if (!isMember)
                return Forbid();

            // Apply updates to event fields
            ev.Title = request.Title;
            ev.Description = request.Description;
            ev.StartDate = request.StartDate;
            ev.EndDate = request.EndDate;
            ev.Location = request.Location;
            ev.DressCode = request.DressCode;
            ev.Notes = request.Notes;

            // Handle assignments update
            if (request.Assignments != null)
            {
                System.Diagnostics.Debug.WriteLine($"[UPDATE EVENT] PROCESSING {request.Assignments.Count} assignments from request");

                // Remove existing assignments
                _context.EventAssignments.RemoveRange(ev.Assignments);
                System.Diagnostics.Debug.WriteLine($"[UPDATE EVENT] REMOVED {ev.Assignments.Count} existing assignments");

                // Add new assignments from request
                var newAssignments = new List<EventAssignment>();
                foreach (var assignmentData in request.Assignments)
                {
                    System.Diagnostics.Debug.WriteLine($"[UPDATE EVENT]   Processing: MemberName='{assignmentData.MemberName}', Task='{assignmentData.Task}'");

                    if (!string.IsNullOrWhiteSpace(assignmentData.MemberName) && 
                        !string.IsNullOrWhiteSpace(assignmentData.Task))
                    {
                        var assignment = new EventAssignment
                        {
                            Id = Guid.NewGuid(),
                            FamilyEventId = ev.Id,
                            Title = assignmentData.Task,
                            Description = assignmentData.MemberName,
                            QuantityNeeded = 1,
                            AssignedToId = null,
                            Status = AssignmentStatus.Needed,
                            Category = AssignmentCategory.Other
                        };
                        newAssignments.Add(assignment);
                        System.Diagnostics.Debug.WriteLine($"[UPDATE EVENT]     CREATED: Id={assignment.Id}, Title='{assignment.Title}', Description='{assignment.Description}'");
                    }
                    else
                    {
                        System.Diagnostics.Debug.WriteLine($"[UPDATE EVENT]     SKIPPED: Empty memberName or task");
                    }
                }

                ev.Assignments.Clear();
                foreach (var a in newAssignments)
                {
                    ev.Assignments.Add(a);
                    _context.EventAssignments.Add(a); // Explicitly mark as Added
                }
                System.Diagnostics.Debug.WriteLine($"[UPDATE EVENT] ADDED {newAssignments.Count} new assignments to entity");
            }

            // Don't call Update() - ev is already tracked from the query with Include()
            // Calling Update() marks the entire graph as Modified, including new assignments
            await _context.SaveChangesAsync();

            System.Diagnostics.Debug.WriteLine("[UPDATE EVENT] SaveChanges() COMPLETED");

            // Immediately re-query to verify DB state
            var verifyEv = await _context.FamilyEvents
                .Include(e => e.Assignments)
                .FirstOrDefaultAsync(e => e.Id == id);

            System.Diagnostics.Debug.WriteLine($"[UPDATE EVENT] VERIFICATION QUERY - Assignments in DB: {verifyEv?.Assignments.Count ?? 0}");
            if (verifyEv != null && verifyEv.Assignments.Any())
            {
                foreach (var a in verifyEv.Assignments)
                {
                    System.Diagnostics.Debug.WriteLine($"[UPDATE EVENT]   DB Assignment: Id={a.Id}, Title='{a.Title}', Description='{a.Description}'");
                }
            }

            // Get creator display name
            string creatorDisplayName = null;
            if (ev.CreatedByMemberId != null)
            {
                var creator = await _context.GroupMembers
                    .Include(m => m.User)
                    .FirstOrDefaultAsync(m => m.Id == ev.CreatedByMemberId);
                creatorDisplayName = creator?.User?.DisplayName;
            }

            // Return updated event with assignments
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
                CreatedAt = ev.CreatedAt,
                Assignments = ev.Assignments.Select(a => new SimpleAssignmentResponse
                {
                    MemberName = a.Description ?? string.Empty,
                    Task = a.Title ?? string.Empty
                }).ToList()
            };

            System.Diagnostics.Debug.WriteLine($"[UPDATE EVENT] RESPONSE OBJECT - Assignments: {response.Assignments?.Count ?? 0}");
            if (response.Assignments != null)
            {
                foreach (var a in response.Assignments)
                {
                    System.Diagnostics.Debug.WriteLine($"[UPDATE EVENT]   Response Assignment: MemberName='{a.MemberName}', Task='{a.Task}'");
                }
            }

            var jsonResponse = System.Text.Json.JsonSerializer.Serialize(response, new System.Text.Json.JsonSerializerOptions 
            { 
                PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                WriteIndented = true 
            });
            System.Diagnostics.Debug.WriteLine("[UPDATE EVENT] RAW JSON RESPONSE:");
            System.Diagnostics.Debug.WriteLine(jsonResponse);
            System.Diagnostics.Debug.WriteLine("========================================");

            return Ok(response);
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
