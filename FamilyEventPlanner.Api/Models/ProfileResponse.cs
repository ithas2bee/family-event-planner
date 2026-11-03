namespace FamilyEventPlanner.Api.Models;

public sealed class ProfileResponse
{
    public string? Name { get; init; }
    public string Email { get; init; } = string.Empty;
    public int? Age { get; init; }
    public string? Location { get; init; }
    public string? Bio { get; init; }
    public string? ProfilePictureUrl { get; init; }
    public IReadOnlyList<string> Roles { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> FamilyNames { get; init; } = Array.Empty<string>();
}
