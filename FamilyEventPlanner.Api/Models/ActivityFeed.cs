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

        // Who performed the action (nullable for system-generated activities)
        public Guid? ActorMemberId { get; set; }
        public GroupMember? ActorMember { get; set; }

        // e.g. "MemberJoined", "EventCreated", "PollCreated", "PollVoted", "AnnouncementCreated"
        [Required, MaxLength(100)]
        public string ActivityType { get; set; }

        // The ID of the related entity (event, poll, announcement, etc.)
        public Guid? RelatedEntityId { get; set; }

        // e.g. "Event", "Poll", "Announcement"
        [MaxLength(100)]
        public string? RelatedEntityType { get; set; }

        // JSON blob for display data so the feed doesn't need joins
        // e.g. {"title":"Family Reunion"} or {"question":"What food?"}
        public string? MetadataJson { get; set; }

        public DateTime CreatedAtUtc { get; set; }
    }
}
