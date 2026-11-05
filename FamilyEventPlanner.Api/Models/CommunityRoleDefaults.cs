namespace FamilyEventPlanner.Api.Models;

public static class CommunityRoleDefaults
{
    private static readonly string[] FamilyRoles =
        ["Mom", "Dad", "Aunt", "Uncle", "Cousin", "Grandparent", "Child", "Sibling", "Friend", "Other"];
    private static readonly string[] AlumniRoles = ["Graduate", "Alumni", "Faculty", "Former Student"];
    private static readonly string[] SportsRoles = ["Coach", "Player", "Team Manager", "Supporter"];
    private static readonly string[] GeneralRoles = ["Member", "Moderator", "Organizer"];

    public static IReadOnlyList<string> ForGroupType(string? groupType)
    {
        return groupType?.Trim() switch
        {
            "Family" => FamilyRoles,
            "Alumni" => AlumniRoles,
            "Sports & Fitness" => SportsRoles,
            "Parents & Kids" => ["Parent", "Child", "Guardian", "Caregiver"],
            "School & Education" => ["Student", "Teacher", "Faculty", "Organizer"],
            "Work & Professional" => ["Employee", "Manager", "Organizer"],
            "Neighborhood & Local" => ["Resident", "Volunteer", "Organizer"],
            "Support & Care" => ["Member", "Caregiver", "Supporter", "Moderator"],
            _ => GeneralRoles
        };
    }
}
