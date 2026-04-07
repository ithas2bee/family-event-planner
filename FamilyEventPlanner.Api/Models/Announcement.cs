using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class Announcement
    {
        public Guid Id { get; set; }

        [Required]
        public Guid FamilyGroupId { get; set; }
        public FamilyGroup FamilyGroup { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; }

        [Required]
        public string Body { get; set; }

        public Guid? CreatedByMemberId { get; set; }
        public GroupMember? CreatedByMember { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? ExpiresAt { get; set; }
    }
}
