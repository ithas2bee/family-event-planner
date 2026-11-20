using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models.Auth;

public sealed class VerifyExternalAccountDeletionRequest
{
    [Required]
    [MaxLength(128)]
    public string Token { get; set; } = string.Empty;
}
