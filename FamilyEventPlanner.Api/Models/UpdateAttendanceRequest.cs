using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class UpdateAttendanceRequest
    {
        public RsvpStatus Rsvp { get; set; } = RsvpStatus.Unknown;

        public DateTime? ArrivalTime { get; set; }
        public DateTime? DepartureTime { get; set; }

        public int GuestCount { get; set; } = 0;

        public string? Notes { get; set; }
    }
}
