using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class SimpleAssignment
    {
        public string MemberName { get; set; }
        public string Task { get; set; }
    }

    public class UpdateEventRequest
    {
        [Required, MaxLength(200)]
        public string Title { get; set; }

        public string? Description { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public string? Location { get; set; }
        public string? DressCode { get; set; }
        public string? Notes { get; set; }

        // Simple assignments matching frontend structure
        public List<SimpleAssignment>? Assignments { get; set; }
    }
}
