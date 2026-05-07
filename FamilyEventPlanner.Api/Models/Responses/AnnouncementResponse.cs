using System;

namespace FamilyEventPlanner.Api.Models.Responses
{
    public class AnnouncementResponse
    {
        public Guid Id { get; set; }
        public Guid FamilyGroupId { get; set; }
        public string Title { get; set; }
        public string Body { get; set; }
        public Guid? CreatedByMemberId { get; set; }
        public string? CreatorDisplayName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }
}
