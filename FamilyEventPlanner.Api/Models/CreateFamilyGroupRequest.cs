using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class CreateFamilyGroupRequest
    {
        [Required, MaxLength(200)]
        public string Name { get; set; }

        [MaxLength(100)]
        public string GroupType { get; set; } = "Other";

        [MaxLength(500)]
        public string? Description { get; set; }

        [Required]
        public Guid UserId { get; set; }
    }
}
