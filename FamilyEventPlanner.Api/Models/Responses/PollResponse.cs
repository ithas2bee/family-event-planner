using System;
using System.Collections.Generic;

namespace FamilyEventPlanner.Api.Models.Responses
{
    public class PollResponse
    {
        public Guid Id { get; set; }
        public Guid FamilyGroupId { get; set; }
        public Guid? FamilyEventId { get; set; }
        public string Question { get; set; }
        public Guid? CreatedByMemberId { get; set; }
        public string? CreatorDisplayName { get; set; }
        public DateTime CreatedAt { get; set; }
        public Guid? CurrentMemberSelectedOptionId { get; set; }
        public List<PollOptionResponse> Options { get; set; } = new();
    }
}
