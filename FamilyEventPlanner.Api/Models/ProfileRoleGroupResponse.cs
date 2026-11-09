namespace FamilyEventPlanner.Api.Models;

public sealed class ProfileRoleGroupResponse
{
    public Guid GroupId { get; init; }
    public string CommunityName { get; init; } = string.Empty;
    public IReadOnlyList<string> Roles { get; init; } = Array.Empty<string>();
    public IReadOnlyList<Guid> SelectedRoleIds { get; init; } = Array.Empty<Guid>();
    public IReadOnlyList<ProfileRoleOptionResponse> AvailableRoles { get; init; } = Array.Empty<ProfileRoleOptionResponse>();
}

public sealed class ProfileRoleOptionResponse
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public bool IsDefault { get; init; }
}

public sealed class ProfileCommunityRolesUpdateRequest
{
    public Guid GroupId { get; init; }
    public List<Guid> RoleIds { get; init; } = [];
}
