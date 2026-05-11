using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class RespondToKickbackRequest
    {
        [Required]
        public Guid KickbackId { get; set; }

        // "PullingUp" or "Maybe"
        [Required, MaxLength(50)]
        public string ResponseType { get; set; }
    }
}
