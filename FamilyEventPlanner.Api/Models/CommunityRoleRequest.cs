using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models;

public class CommunityRoleRequest
{
    [Required, StringLength(50, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;
}
