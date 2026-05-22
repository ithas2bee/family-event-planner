using System;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class SimpleAssignment
    {
        /// <summary>
        /// Optional: Member ID from the group. If null/empty, assignment uses Unknown Guest member.
        /// </summary>
        public string? MemberId { get; set; }

        /// <summary>
        /// Display name for the assignment (can be custom or snapshot of member name)
        /// </summary>
        public string MemberName { get; set; }

        /// <summary>
        /// Task description
        /// </summary>
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
