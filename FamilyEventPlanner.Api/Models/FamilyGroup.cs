using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class FamilyGroup
    {
        public Guid Id { get; set; }

        [Required]
        public string Name { get; set; }

        public string? InviteCode { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}