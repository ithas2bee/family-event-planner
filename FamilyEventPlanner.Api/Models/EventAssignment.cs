using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public enum AssignmentStatus
    {
        Needed = 0,
        Assigned = 1,
        Completed = 2,
        Cancelled = 3
    }

    public enum AssignmentCategory
    {
        Food,
        Drinks,
        Setup,
        Cleanup,
        Childcare,
        Other
    }

    public class EventAssignment
    {
        public Guid Id { get; set; }

        [Required]
        public Guid FamilyEventId { get; set; }
        public FamilyEvent FamilyEvent { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; }

        public string? Description { get; set; }

        public int QuantityNeeded { get; set; } = 1;

        // Null when a former member's assignment has not been accepted by another member.
        public Guid? AssignedToId { get; set; }
        public GroupMember? AssignedTo { get; set; }

        public AssignmentStatus Status { get; set; } = AssignmentStatus.Needed;
        public AssignmentCategory Category { get; set; } = AssignmentCategory.Other;
    }
}
