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
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public NotificationsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/notifications
        [HttpGet]
        public async Task<IActionResult> GetForMember()
        {
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var member = await _context.GroupMembers.FindAsync(memberId);
            if (member == null)
                return NotFound(new { message = "Member not found." });

            var list = await _context.Notifications.Where(n => n.MemberId == memberId).OrderByDescending(n => n.CreatedAt).ToListAsync();
            var resp = list.Select(n => new FamilyEventPlanner.Api.Models.Responses.NotificationResponse
            {
                Id = n.Id,
                MemberId = n.MemberId,
                Message = n.Message,
                IsRead = n.IsRead,
                Type = n.Type,
                Link = n.Link,
                CreatedAt = n.CreatedAt
            });

            return Ok(resp);
        }

        // POST: api/notifications
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateNotificationRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var member = await _context.GroupMembers.FindAsync(request.MemberId);
            if (member == null)
                return NotFound(new { message = "Member not found." });

            var notif = new Notification
            {
                Id = Guid.NewGuid(),
                MemberId = request.MemberId,
                Message = request.Message,
                Type = request.Type,
                Link = request.Link,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.Notifications.Add(notif);
            await _context.SaveChangesAsync();

            var resp = new FamilyEventPlanner.Api.Models.Responses.NotificationResponse
            {
                Id = notif.Id,
                MemberId = notif.MemberId,
                Message = notif.Message,
                IsRead = notif.IsRead,
                Type = notif.Type,
                Link = notif.Link,
                CreatedAt = notif.CreatedAt
            };

            return CreatedAtAction(nameof(GetForMember), resp);
        }

        // PUT: api/notifications/{id}/read
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkRead(Guid id, [FromBody] MarkNotificationReadRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var notif = await _context.Notifications.FindAsync(id);
            if (notif == null)
                return NotFound(new { message = "Notification not found." });
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            if (notif.MemberId != memberId)
                return Forbid();

            notif.IsRead = true;
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
