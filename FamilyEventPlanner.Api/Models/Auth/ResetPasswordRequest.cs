using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models.Auth;

public class ResetPasswordRequest
{
    [Required, StringLength(128)]
    public string Token { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 8)]
    [RegularExpression(@"^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$",
        ErrorMessage = "Password must be at least 8 characters and include a letter, number, and symbol.")]
    public string Password { get; set; } = string.Empty;

    [Required, StringLength(128)]
    public string ConfirmPassword { get; set; } = string.Empty;
}
