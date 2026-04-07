using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class JoinGroupRequest
    {
        [Required]
        public string InviteCode { get; set; }

        [Required]
        public string Name { get; set; }

        [Required, EmailAddress]
        public string Email { get; set; }
    }
}
