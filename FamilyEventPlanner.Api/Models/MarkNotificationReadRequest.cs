using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class MarkNotificationReadRequest
    {
        [Required]
        public Guid MemberId { get; set; }
    }
}
