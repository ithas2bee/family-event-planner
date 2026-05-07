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

            var ann = new Announcement
            {
                Id = Guid.NewGuid(),
                FamilyGroupId = request.FamilyGroupId,
                Title = request.Title,
                Body = request.Body,
                CreatedByMemberId = memberId,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = request.ExpiresAt
            };

            _context.Announcements.Add(ann);
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
                .Where(a => a.FamilyGroupId == familyGroupId)
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
            var ann = await _context.Announcements.Include(a => a.FamilyGroup).FirstOrDefaultAsync(a => a.Id == id);
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

            var ann = await _context.Announcements.FirstOrDefaultAsync(a => a.Id == id);
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
            ann.ExpiresAt = request.ExpiresAt;

            await _context.SaveChangesAsync();

            return NoContent();
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

            _context.Announcements.Remove(ann);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
