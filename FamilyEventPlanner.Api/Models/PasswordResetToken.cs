using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models;

public class PasswordResetToken
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    [MaxLength(64)]
    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAtUtc { get; set; }

    public DateTime? UsedAtUtc { get; set; }
}
