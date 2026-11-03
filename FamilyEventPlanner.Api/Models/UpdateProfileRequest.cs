using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models;

public sealed class UpdateProfileRequest
{
    [MaxLength(160)]
    public string? Name { get; init; }

    [Range(0, 150)]
    public int? Age { get; init; }

    [MaxLength(160)]
    public string? Location { get; init; }

    [MaxLength(2000)]
    public string? Bio { get; init; }

    [MaxLength(1024)]
    public string? ProfilePictureUrl { get; init; }

    public List<string>? Roles { get; init; }
}
