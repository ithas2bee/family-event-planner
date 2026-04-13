using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models.Auth
{
    public class RegisterRequest
    {
        [Required, EmailAddress]
        public string Email { get; set; }

        [Required]
        public string DisplayName { get; set; }

        [Required]
        public string Password { get; set; }
    }
}
