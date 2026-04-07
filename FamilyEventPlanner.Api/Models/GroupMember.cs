using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class GroupMember
    {
        public Guid Id { get; set; }

        public Guid FamilyGroupId { get; set; }

        public FamilyGroup FamilyGroup { get; set; }

        [Required]
        public string Name { get; set; }

        [Required]
        public string Email { get; set; }

        public bool IsAdmin { get; set; }

        public DateTime JoinedAt { get; set; }
    }
}
