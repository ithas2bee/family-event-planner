using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class JoinGroupRequest
    {
        [Required]
        public string InviteCode { get; set; }

        [Required]
        public Guid UserId { get; set; }
    }
}
