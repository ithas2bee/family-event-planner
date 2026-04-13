using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class GroupMember
    {
        public Guid Id { get; set; }

        public Guid FamilyGroupId { get; set; }
        public FamilyGroup FamilyGroup { get; set; }

        // UserId is now required (not nullable)
        [Required]
        public Guid UserId { get; set; }
        public User User { get; set; }

        public bool IsAdmin { get; set; }

        public DateTime JoinedAt { get; set; }
    }
}
