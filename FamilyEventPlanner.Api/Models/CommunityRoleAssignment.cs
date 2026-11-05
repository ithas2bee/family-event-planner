namespace FamilyEventPlanner.Api.Models;

public sealed class CommunityRoleAssignment
{
    public Guid FamilyGroupId { get; set; }
    public Guid GroupMemberId { get; set; }
    public GroupMember GroupMember { get; set; } = null!;
    public Guid CommunityRoleId { get; set; }
    public CommunityRole CommunityRole { get; set; } = null!;
}
