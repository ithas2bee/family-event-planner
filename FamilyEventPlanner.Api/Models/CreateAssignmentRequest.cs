using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class CreateAssignmentRequest
    {
        [Required]
        public Guid FamilyEventId { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; }

        public string? Description { get; set; }

        public int QuantityNeeded { get; set; } = 1;

        public Guid? AssignedToId { get; set; }

        public AssignmentCategory Category { get; set; } = AssignmentCategory.Other;
    }
}
