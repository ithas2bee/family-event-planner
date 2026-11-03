using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class UpdateGroupDescriptionRequest
    {
        [MaxLength(500)]
        public string? Description { get; set; }
    }
}
