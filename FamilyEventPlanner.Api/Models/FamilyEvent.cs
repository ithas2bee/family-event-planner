using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class FamilyEvent
    {
        public Guid Id { get; set; }

        [Required]
        public Guid FamilyGroupId { get; set; }
        public FamilyGroup FamilyGroup { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; }

        public string? Description { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        public string? Location { get; set; }
        public string? DressCode { get; set; }
        public string? Notes { get; set; }

        public Guid? CreatedByMemberId { get; set; }
        public GroupMember? CreatedByMember { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
