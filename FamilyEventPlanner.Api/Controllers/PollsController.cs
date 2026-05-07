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
    public class PollsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PollsController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/polls
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePollRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Validate minimum 2 options
            if (request.Options == null || request.Options.Count < 2)
                return BadRequest(new { message = "Poll must have at least 2 options." });

            // Reject empty option text
            if (request.Options.Any(o => string.IsNullOrWhiteSpace(o)))
                return BadRequest(new { message = "Poll options cannot be empty." });

            // Validate group
            var group = await _context.FamilyGroups.FindAsync(request.FamilyGroupId);
            if (group == null)
                return NotFound(new { message = "FamilyGroup not found." });

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

            var poll = new Poll
            {
                Id = Guid.NewGuid(),
                FamilyEventId = request.FamilyEventId,
                FamilyGroupId = request.FamilyGroupId,
                Question = request.Question,
                CreatedByMemberId = memberId,
                CreatedAt = DateTime.UtcNow
            };

            foreach (var optText in request.Options)
            {
                var option = new PollOption
                {
                    Id = Guid.NewGuid(),
                    PollId = poll.Id,
                    Text = optText
                };
                poll.Options.Add(option);
            }

            _context.Polls.Add(poll);
            await _context.SaveChangesAsync();

            System.Diagnostics.Debug.WriteLine($"[CREATE POLL] Poll {poll.Id} created by member {memberId} in group {request.FamilyGroupId}");

            var resp = new PollResponse
            {
                Id = poll.Id,
                FamilyGroupId = poll.FamilyGroupId,
                FamilyEventId = poll.FamilyEventId,
                Question = poll.Question,
                CreatorDisplayName = member.User?.DisplayName,
                CreatedByMemberId = poll.CreatedByMemberId,
                CreatedAt = poll.CreatedAt,
                Options = poll.Options.Select(o => new PollOptionResponse { Id = o.Id, Text = o.Text, VoteCount = 0 }).ToList()
            };

            return CreatedAtAction(nameof(GetById), new { id = poll.Id }, resp);
        }

        // GET: api/polls/group/{familyGroupId}
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

            System.Diagnostics.Debug.WriteLine($"[GET POLLS] Fetching polls for group {familyGroupId}, requested by member {memberId}");

            pageNumber = Math.Max(1, pageNumber);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var polls = await _context.Polls
                .Where(p => p.FamilyGroupId == familyGroupId)
                .Include(p => p.Options)
                .OrderByDescending(p => p.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new List<PollResponse>();

            foreach (var p in polls)
            {
                // Get creator display name
                string creatorDisplayName = null;
                if (p.CreatedByMemberId != null)
                {
                    var creator = await _context.GroupMembers
                        .Include(m => m.User)
                        .FirstOrDefaultAsync(m => m.Id == p.CreatedByMemberId);
                    creatorDisplayName = creator?.User?.DisplayName;
                }

                // Get current member's vote for this poll if exists
                var memberVote = await _context.PollVotes
                    .Include(v => v.PollOption)
                    .FirstOrDefaultAsync(v => v.MemberId == memberId && v.PollOption.PollId == p.Id);

                var pollResponse = new PollResponse
                {
                    Id = p.Id,
                    FamilyGroupId = p.FamilyGroupId,
                    FamilyEventId = p.FamilyEventId,
                    Question = p.Question,
                    CreatorDisplayName = creatorDisplayName,
                    CreatedByMemberId = p.CreatedByMemberId,
                    CreatedAt = p.CreatedAt,
                    CurrentMemberSelectedOptionId = memberVote?.PollOptionId,
                    Options = p.Options.Select(o => new PollOptionResponse
                    {
                        Id = o.Id,
                        Text = o.Text,
                        VoteCount = _context.PollVotes.Count(v => v.PollOptionId == o.Id)
                    }).ToList()
                };

                result.Add(pollResponse);
            }

            System.Diagnostics.Debug.WriteLine($"[GET POLLS] Returning {result.Count} polls for group {familyGroupId}");

            return Ok(result);
        }

        // GET: api/polls/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var poll = await _context.Polls.Include(p => p.Options).FirstOrDefaultAsync(p => p.Id == id);
            if (poll == null)
                return NotFound(new { message = "Poll not found." });
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == poll.FamilyGroupId);
            if (!isMember)
                return Forbid();

            // Get creator display name
            string creatorDisplayName = null;
            if (poll.CreatedByMemberId != null)
            {
                var creator = await _context.GroupMembers
                    .Include(m => m.User)
                    .FirstOrDefaultAsync(m => m.Id == poll.CreatedByMemberId);
                creatorDisplayName = creator?.User?.DisplayName;
            }

            // Get current member's vote for this poll if exists
            var memberVote = await _context.PollVotes
                .Include(v => v.PollOption)
                .FirstOrDefaultAsync(v => v.MemberId == memberId && v.PollOption.PollId == poll.Id);

            var resp = new PollResponse
            {
                Id = poll.Id,
                FamilyGroupId = poll.FamilyGroupId,
                FamilyEventId = poll.FamilyEventId,
                Question = poll.Question,
                CreatorDisplayName = creatorDisplayName,
                CreatedByMemberId = poll.CreatedByMemberId,
                CreatedAt = poll.CreatedAt,
                CurrentMemberSelectedOptionId = memberVote?.PollOptionId,
                Options = poll.Options.Select(o => new PollOptionResponse
                {
                    Id = o.Id,
                    Text = o.Text,
                    VoteCount = _context.PollVotes.Count(v => v.PollOptionId == o.Id)
                }).ToList()
            };

            return Ok(resp);
        }

        // POST: api/polls/vote
        [HttpPost("vote")]
        public async Task<IActionResult> Vote([FromBody] VoteRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var option = await _context.PollOptions.Include(o => o.Poll).FirstOrDefaultAsync(o => o.Id == request.PollOptionId);
            if (option == null)
                return NotFound(new { message = "Poll option not found." });

            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            // Check member exists in group
            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == option.Poll.FamilyGroupId);
            if (!isMember)
                return Forbid();

            // Ensure one vote per member per poll
            var already = await _context.PollVotes.Include(v => v.PollOption)
                .AnyAsync(v => v.MemberId == memberId && v.PollOption.PollId == option.PollId);
            if (already)
                return BadRequest(new { message = "Member has already voted in this poll." });

            var vote = new PollVote
            {
                Id = Guid.NewGuid(),
                PollOptionId = request.PollOptionId,
                MemberId = memberId,
                CreatedAt = DateTime.UtcNow
            };

            _context.PollVotes.Add(vote);
            await _context.SaveChangesAsync();

            return Ok(new { vote.Id, vote.PollOptionId, vote.MemberId, vote.CreatedAt });
        }
    }
}
