using System;

namespace FamilyEventPlanner.Api.Models.Responses
{
    public class AssignmentResponse
    {
        public Guid Id { get; set; }
        public Guid FamilyEventId { get; set; }
        public string Title { get; set; }
        public string? Description { get; set; }
        public int QuantityNeeded { get; set; }
        public Guid? AssignedToId { get; set; }
        public int Status { get; set; }
        public int Category { get; set; }
    }
}
