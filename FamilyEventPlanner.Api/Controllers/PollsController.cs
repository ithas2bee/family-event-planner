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

            // Validate group
            var group = await _context.FamilyGroups.FindAsync(request.FamilyGroupId);
            if (group == null)
                return NotFound(new { message = "FamilyGroup not found." });

            // If event specified, validate it belongs to group
            if (request.FamilyEventId.HasValue)
            {
                var ev = await _context.FamilyEvents.FindAsync(request.FamilyEventId.Value);
                if (ev == null || ev.FamilyGroupId != request.FamilyGroupId)
                    return BadRequest(new { message = "FamilyEvent invalid for group." });
            }

            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            var isMember = await _context.GroupMembers.AnyAsync(m => m.Id == memberId && m.FamilyGroupId == request.FamilyGroupId);
            if (!isMember)
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

            var resp = new PollResponse
            {
                Id = poll.Id,
                FamilyGroupId = poll.FamilyGroupId,
                FamilyEventId = poll.FamilyEventId,
                Question = poll.Question,
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

            pageNumber = Math.Max(1, pageNumber);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var polls = await _context.Polls
                .Where(p => p.FamilyGroupId == familyGroupId)
                .Include(p => p.Options)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = polls.Select(p => new PollResponse
            {
                Id = p.Id,
                FamilyGroupId = p.FamilyGroupId,
                FamilyEventId = p.FamilyEventId,
                Question = p.Question,
                Options = p.Options.Select(o => new PollOptionResponse
                {
                    Id = o.Id,
                    Text = o.Text,
                    VoteCount = _context.PollVotes.Count(v => v.PollOptionId == o.Id)
                }).ToList()
            });

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

            var resp = new PollResponse
            {
                Id = poll.Id,
                FamilyGroupId = poll.FamilyGroupId,
                FamilyEventId = poll.FamilyEventId,
                Question = poll.Question,
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
