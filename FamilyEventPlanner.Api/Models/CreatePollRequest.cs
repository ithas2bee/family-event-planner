using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class CreatePollRequest
    {
        public Guid? FamilyEventId { get; set; }

        [Required]
        public Guid FamilyGroupId { get; set; }

        [Required, MaxLength(500)]
        public string Question { get; set; }

        [Required]
        public List<string> Options { get; set; } = new();

        public Guid? CreatedByMemberId { get; set; }
    }
}
