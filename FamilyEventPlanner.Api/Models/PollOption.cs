using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class PollOption
    {
        public Guid Id { get; set; }

        [Required]
        public Guid PollId { get; set; }
        public Poll Poll { get; set; }

        [Required, MaxLength(200)]
        public string Text { get; set; }
    }
}
