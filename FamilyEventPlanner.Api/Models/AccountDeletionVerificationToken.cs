using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models;

public sealed class AccountDeletionVerificationToken
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    [MaxLength(64)]
    public string TokenHash { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; }

    public DateTime ExpiresAtUtc { get; set; }

    public DateTime? UsedAtUtc { get; set; }
}
