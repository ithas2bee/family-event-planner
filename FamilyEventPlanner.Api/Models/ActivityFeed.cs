using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class ActivityFeed
    {
        public Guid Id { get; set; }

        [Required]
        public Guid FamilyGroupId { get; set; }
        public FamilyGroup FamilyGroup { get; set; }

        public Guid? ActorMemberId { get; set; }
        public GroupMember? ActorMember { get; set; }

        [Required, MaxLength(100)]
        public string ActivityType { get; set; }

        public Guid? RelatedEntityId { get; set; }

        [MaxLength(100)]
        public string? RelatedEntityType { get; set; }

        public string? MetadataJson { get; set; }

        public DateTime CreatedAtUtc { get; set; }
    }
}
