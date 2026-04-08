using System;

namespace FamilyEventPlanner.Api.Models.Responses
{
    public class NotificationResponse
    {
        public Guid Id { get; set; }
        public Guid MemberId { get; set; }
        public string Message { get; set; }
        public bool IsRead { get; set; }
        public string? Type { get; set; }
        public string? Link { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
