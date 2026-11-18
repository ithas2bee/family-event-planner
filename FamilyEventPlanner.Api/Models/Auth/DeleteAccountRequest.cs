using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models.Auth;

public sealed class DeleteAccountRequest
{
    [Required]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string Confirmation { get; set; } = string.Empty;
}
