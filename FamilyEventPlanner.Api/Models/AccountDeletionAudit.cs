namespace FamilyEventPlanner.Api.Models;

public sealed class AccountDeletionAudit
{
    public Guid Id { get; set; }

    public DateTime CompletedAtUtc { get; set; }
}
