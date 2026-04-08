using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class VoteRequest
    {
        [Required]
        public Guid PollOptionId { get; set; }

        // MemberId is taken from authenticated caller (X-Member-Id header)
        public Guid? MemberId { get; set; }
    }
}
