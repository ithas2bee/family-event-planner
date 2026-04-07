using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public enum RsvpStatus
    {
        Unknown = 0,
        Yes = 1,
        No = 2,
        Maybe = 3
    }

    public class EventAttendance
    {
        public Guid Id { get; set; }

        [Required]
        public Guid FamilyEventId { get; set; }
        public FamilyEvent FamilyEvent { get; set; }

        [Required]
        public Guid MemberId { get; set; }
        public GroupMember Member { get; set; }

        public RsvpStatus Rsvp { get; set; } = RsvpStatus.Unknown;

        public DateTime? ArrivalTime { get; set; }
        public DateTime? DepartureTime { get; set; }

        public int GuestCount { get; set; } = 0;

        public string? Notes { get; set; }
    }
}
