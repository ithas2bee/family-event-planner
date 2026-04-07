using System;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace FamilyEventPlanner.Api.Models
{
    public class Poll
    {
        public Guid Id { get; set; }

        // Poll can be tied to a specific event OR be group-level
        public Guid? FamilyEventId { get; set; }
        public FamilyEvent? FamilyEvent { get; set; }

        [Required]
        public Guid FamilyGroupId { get; set; }
        public FamilyGroup FamilyGroup { get; set; }

        [Required, MaxLength(500)]
        public string Question { get; set; }

        public Guid? CreatedByMemberId { get; set; }
        public GroupMember? CreatedByMember { get; set; }

        public DateTime CreatedAt { get; set; }

        public List<PollOption> Options { get; set; } = new();
    }
}
