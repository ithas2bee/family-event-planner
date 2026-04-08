using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class CreateNotificationRequest
    {
        [Required]
        public Guid MemberId { get; set; }

        [Required, MaxLength(500)]
        public string Message { get; set; }

        public string? Type { get; set; }
        public string? Link { get; set; }
    }
}
