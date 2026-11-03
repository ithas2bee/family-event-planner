using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class FamilyGroup
    {
        public Guid Id { get; set; }

        [Required]
        public string Name { get; set; }

        [MaxLength(100)]
        public string GroupType { get; set; } = "Other";

        [MaxLength(500)]
        public string? Description { get; set; }

        public bool IsInviteOnly { get; set; } = true;

        public bool IsSearchable { get; set; }

        public string? InviteCode { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}