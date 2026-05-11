using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class KickbackResponse
    {
        public Guid Id { get; set; }

        [Required]
        public Guid KickbackId { get; set; }
        public Kickback Kickback { get; set; }

        [Required]
        public Guid MemberId { get; set; }
        public GroupMember Member { get; set; }

        // "PullingUp" or "Maybe"
        [Required, MaxLength(50)]
        public string ResponseType { get; set; }

        public DateTime CreatedAtUtc { get; set; }
    }
}
