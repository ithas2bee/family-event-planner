using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models.Auth;

public sealed class ExternalAccountDeletionRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(254)]
    public string Email { get; set; } = string.Empty;
}
