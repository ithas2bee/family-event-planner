using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class CreateKickbackRequest
    {
        [Required]
        public Guid FamilyGroupId { get; set; }

        [Required, MaxLength(100)]
        public string Vibe { get; set; }

        [MaxLength(500)]
        public string? Note { get; set; }

        [Required]
        public DateTime ExpiresAtUtc { get; set; }
    }
}
