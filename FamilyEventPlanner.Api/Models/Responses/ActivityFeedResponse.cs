using System;

namespace FamilyEventPlanner.Api.Models.Responses
{
    public class ActivityFeedResponse
    {
        public Guid Id { get; set; }
        public Guid FamilyGroupId { get; set; }
        public Guid? ActorMemberId { get; set; }
        public string? ActorDisplayName { get; set; }
        public string ActivityType { get; set; }
        public Guid? RelatedEntityId { get; set; }
        public string? RelatedEntityType { get; set; }
        public string? MetadataJson { get; set; }
        public string Message { get; set; }
        public DateTime CreatedAtUtc { get; set; }
    }
}
