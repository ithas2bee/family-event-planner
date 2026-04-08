using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class UpdateAnnouncementRequest
    {
        [Required, MaxLength(200)]
        public string Title { get; set; }

        [Required]
        public string Body { get; set; }

        public DateTime? ExpiresAt { get; set; }
    }
}
