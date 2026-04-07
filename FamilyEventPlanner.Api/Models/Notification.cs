using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class Notification
    {
        public Guid Id { get; set; }

        [Required]
        public Guid MemberId { get; set; }
        public GroupMember Member { get; set; }

        [Required, MaxLength(500)]
        public string Message { get; set; }

        public bool IsRead { get; set; } = false;

        public string? Type { get; set; }

        public string? Link { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
