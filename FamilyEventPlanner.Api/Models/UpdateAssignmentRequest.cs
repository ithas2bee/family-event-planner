using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class UpdateAssignmentRequest
    {
        [Required, MaxLength(200)]
        public string Title { get; set; }

        public string? Description { get; set; }

        public int QuantityNeeded { get; set; } = 1;

        public Guid? AssignedToId { get; set; }

        public AssignmentStatus Status { get; set; } = AssignmentStatus.Needed;
        public AssignmentCategory Category { get; set; } = AssignmentCategory.Other;
    }
}
