using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class PollVote
    {
        public Guid Id { get; set; }

        [Required]
        public Guid PollOptionId { get; set; }
        public PollOption PollOption { get; set; }

        [Required]
        public Guid MemberId { get; set; }
        public GroupMember Member { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
