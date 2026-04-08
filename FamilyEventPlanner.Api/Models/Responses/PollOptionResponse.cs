using System;

namespace FamilyEventPlanner.Api.Models.Responses
{
    public class PollOptionResponse
    {
        public Guid Id { get; set; }
        public string Text { get; set; }
        public int VoteCount { get; set; }
    }
}
