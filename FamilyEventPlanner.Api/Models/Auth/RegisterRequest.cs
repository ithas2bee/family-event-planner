using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models.Auth
{
    public class RegisterRequest
    {
        [Required, EmailAddress]
        public string Email { get; set; }

        [Required, StringLength(50, MinimumLength = 2)]
        public string DisplayName { get; set; }

        [Required, StringLength(128, MinimumLength = 8)]
        [RegularExpression(@"^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$",
            ErrorMessage = "Password must be at least 8 characters and include a letter, number, and symbol.")]
        public string Password { get; set; }
    }
}
