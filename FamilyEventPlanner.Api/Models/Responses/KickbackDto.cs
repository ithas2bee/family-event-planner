using System;
using System.Collections.Generic;

namespace FamilyEventPlanner.Api.Models.Responses
{
    public class KickbackDto
    {
        public Guid Id { get; set; }
        public Guid FamilyGroupId { get; set; }
        public Guid? CreatedByMemberId { get; set; }
        public string? CreatorDisplayName { get; set; }
        public string Vibe { get; set; }
        public string? Note { get; set; }
        public DateTime ExpiresAtUtc { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public bool IsActive { get; set; }

        // Response counts
        public int PullingUpCount { get; set; }
        public int MaybeCount { get; set; }

        // Current member's response (null if no response yet)
        public string? CurrentMemberResponse { get; set; }
    }
}
