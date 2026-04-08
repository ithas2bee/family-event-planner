using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class CreateAnnouncementRequest
    {
        [Required]
        public Guid FamilyGroupId { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; }

        [Required]
        public string Body { get; set; }

        public Guid? CreatedByMemberId { get; set; }

        public DateTime? ExpiresAt { get; set; }
    }
}
