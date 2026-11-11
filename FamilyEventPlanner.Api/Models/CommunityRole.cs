using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models;

public class CommunityRole
{
    public Guid Id { get; set; }

    public Guid FamilyGroupId { get; set; }
    public FamilyGroup FamilyGroup { get; set; } = null!;

    [Required, MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    public bool IsDefault { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
