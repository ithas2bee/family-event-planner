using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models.Auth
{
    public class LoginRequest
    {
        [Required, EmailAddress]
        public string Email { get; set; }

        [Required, StringLength(128)]
        public string Password { get; set; }
    }
}
