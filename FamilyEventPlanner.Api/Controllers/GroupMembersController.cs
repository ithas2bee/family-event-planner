using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FamilyEventPlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GroupMembersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GroupMembersController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Join a family group using an invite code.
        /// Returns camelCase JSON with memberId, groupId, memberName, groupName, isAdmin for React frontend.
        /// </summary>
        [HttpPost("join")]
        public async Task<IActionResult> JoinGroup([FromBody] JoinGroupRequest request)
        {
            // TEMPORARY LOGGING - Remove in production
            System.Diagnostics.Debug.WriteLine($"[JOIN ENDPOINT] Request received at {DateTime.UtcNow}");
            System.Diagnostics.Debug.WriteLine($"[JOIN ENDPOINT] InviteCode: {request?.InviteCode}");
            System.Diagnostics.Debug.WriteLine($"[JOIN ENDPOINT] Email: {request?.Email}");
            System.Diagnostics.Debug.WriteLine($"[JOIN ENDPOINT] Name: {request?.Name}");

            if (!ModelState.IsValid)
            {
                var errors = string.Join(", ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)));
                System.Diagnostics.Debug.WriteLine($"[JOIN ENDPOINT] ModelState invalid: {errors}");
                return BadRequest(ModelState);
            }

            var group = await _context.FamilyGroups
                .FirstOrDefaultAsync(g => g.InviteCode == request.InviteCode);

            if (group == null)
            {
                System.Diagnostics.Debug.WriteLine($"[JOIN ENDPOINT] Invalid invite code: {request.InviteCode}");
                return NotFound("Invalid invite code.");
            }

            var existingMember = await _context.GroupMembers.FirstOrDefaultAsync(m =>
                m.FamilyGroupId == group.Id &&
                m.Email == request.Email);

            if (existingMember != null)
            {
                System.Diagnostics.Debug.WriteLine($"[JOIN ENDPOINT] Duplicate member: {request.Email} already in group {group.Id}");
                return BadRequest("You are already in this group.");
            }

            var member = new GroupMember
            {
                Id = Guid.NewGuid(),
                FamilyGroupId = group.Id,
                Name = request.Name,
                Email = request.Email,
                IsAdmin = false,
                JoinedAt = DateTime.UtcNow
            };

            _context.GroupMembers.Add(member);
            await _context.SaveChangesAsync();

            System.Diagnostics.Debug.WriteLine($"[JOIN ENDPOINT] Member created successfully: {member.Id}");
            
            // Return camelCase JSON response for React frontend
            var response = new
            {
                memberId = member.Id,
                groupId = member.FamilyGroupId,
                memberName = member.Name,
                groupName = group.Name,
                isAdmin = member.IsAdmin,
                email = member.Email,
                joinedAt = member.JoinedAt
            };
            
            return CreatedAtAction(nameof(GetMembers), new { groupId = member.FamilyGroupId }, response);
        }

        /// <summary>
        /// Get all members in a family group.
        /// Requires X-Member-Id header and caller must be a member of the group.
        /// </summary>
        [Microsoft.AspNetCore.Authorization.Authorize]
        [HttpGet("{groupId}")]
        public async Task<IActionResult> GetMembers(Guid groupId)
        {
            System.Diagnostics.Debug.WriteLine($"[GET MEMBERS] Endpoint called at {DateTime.UtcNow}");
            System.Diagnostics.Debug.WriteLine($"[GET MEMBERS] Requested groupId: {groupId}");
            System.Diagnostics.Debug.WriteLine($"[GET MEMBERS] User identity authenticated: {User.Identity?.IsAuthenticated}");
            System.Diagnostics.Debug.WriteLine($"[GET MEMBERS] User identity type: {User.Identity?.AuthenticationType}");
            
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            System.Diagnostics.Debug.WriteLine($"[GET MEMBERS] memberId claim value: '{memberIdClaim}'");
            
            if (memberIdClaim == null)
            {
                System.Diagnostics.Debug.WriteLine("[GET MEMBERS] memberId claim is null - authentication failed");
                return Forbid();
            }
            
            if (!Guid.TryParse(memberIdClaim, out var memberId))
            {
                System.Diagnostics.Debug.WriteLine($"[GET MEMBERS] Failed to parse memberId claim '{memberIdClaim}' as GUID");
                return Forbid();
            }

            System.Diagnostics.Debug.WriteLine($"[GET MEMBERS] Authenticated member Id: {memberId}");
            
            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == groupId);
            System.Diagnostics.Debug.WriteLine($"[GET MEMBERS] Member {memberId} is member of group {groupId}: {isMember}");
            
            if (!isMember)
            {
                System.Diagnostics.Debug.WriteLine($"[GET MEMBERS] Access denied - member {memberId} not in group {groupId}");
                return Forbid();
            }

            var members = await _context.GroupMembers
                .Where(m => m.FamilyGroupId == groupId)
                .ToListAsync();

            System.Diagnostics.Debug.WriteLine($"[GET MEMBERS] Found {members.Count} members in group {groupId}");
            return Ok(members);
        }
    }
}
