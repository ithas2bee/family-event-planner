using System;

namespace FamilyEventPlanner.Api.Models.Responses
{
    public class AttendanceResponse
    {
        public Guid Id { get; set; }
        public Guid FamilyEventId { get; set; }
        public Guid MemberId { get; set; }
        public int Rsvp { get; set; }
        public DateTime? ArrivalTime { get; set; }
        public DateTime? DepartureTime { get; set; }
        public int GuestCount { get; set; }
        public string? Notes { get; set; }
    }
}
