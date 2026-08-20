using System;
using System.Collections.Generic;

namespace FamilyEventPlanner.Api.Models
{
    public class SimpleAssignmentResponse
    {
        public string? MemberId { get; set; }
        public string MemberName { get; set; }
        public string Task { get; set; }
    }

    public class EventResponse
    {
        public Guid Id { get; set; }
        public Guid FamilyGroupId { get; set; }
        public string Title { get; set; }
        public string? Description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? Location { get; set; }
        public string? DressCode { get; set; }
        public string? Notes { get; set; }
        public Guid? CreatedByMemberId { get; set; }
        public string? CreatorDisplayName { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<SimpleAssignmentResponse>? Assignments { get; set; }
    }
}
