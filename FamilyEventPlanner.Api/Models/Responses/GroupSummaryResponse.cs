using System;

namespace FamilyEventPlanner.Api.Models.Responses
{
    public class GroupSummaryResponse
    {
        public Guid groupId { get; set; }
        public string groupName { get; set; }
        public string inviteCode { get; set; }
        public bool isAdmin { get; set; }
    }
}
