namespace FamilyEventPlanner.Api.Models;

public sealed class MemberProfileResponse
{
    public string? Name { get; init; }
    public int? Age { get; init; }
    public string? Location { get; init; }
    public string? Bio { get; init; }
    public string? ProfilePictureUrl { get; init; }
    public IReadOnlyList<MemberProfileCommunityResponse> Communities { get; init; } = [];
}

public sealed class MemberProfileCommunityResponse
{
    public Guid GroupId { get; init; }
    public string CommunityName { get; init; } = string.Empty;
    public IReadOnlyList<string> Roles { get; init; } = [];
}
