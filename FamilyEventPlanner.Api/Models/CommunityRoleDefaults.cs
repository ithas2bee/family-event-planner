namespace FamilyEventPlanner.Api.Models;

public static class CommunityRoleDefaults
{
    public static IReadOnlyList<string> ForGroupType(string? groupType)
    {
        return groupType?.Trim() switch
        {
            "Family" => ["Mom", "Dad", "Child", "Grandparent"],
            "Friends" => ["Friend", "Best Friend", "Host", "Guest"],
            "Couples" => ["Partner 1", "Partner 2", "Couple Friend", "Guest"],
            "Parents & Kids" => ["Parent", "Child", "Guardian", "Caregiver"],
            "Sports & Fitness" => ["Coach", "Player", "Trainer", "Team Manager"],
            "School & Education" => ["Student", "Teacher", "Parent", "Staff"],
            "Work & Professional" => ["Employee", "Manager", "Team Lead", "Consultant"],
            "Neighborhood & Local" => ["Resident", "Neighbor", "Community Leader", "Volunteer"],
            "Hobbies & Interests" => ["Enthusiast", "Beginner", "Expert", "Instructor"],
            "Faith & Spiritual" => ["Faith Leader", "Member", "Volunteer", "Ministry Leader"],
            "Clubs & Organizations" => ["President", "Officer", "Member", "Volunteer"],
            "Travel" => ["Trip Organizer", "Traveler", "Travel Companion", "Guest"],
            "Alumni" => ["Graduate", "Current Student", "Faculty", "Alumni Organizer"],
            "Support & Care" => ["Caregiver", "Recipient", "Support Volunteer", "Coordinator"],
            "Events & Social" => ["Event Organizer", "Host", "Participant", "Volunteer"],
            _ => ["Member", "Organizer", "Coordinator", "Guest"]
        };
    }
}
