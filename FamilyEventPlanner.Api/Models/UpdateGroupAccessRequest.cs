using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class UpdateGroupAccessRequest
    {
        [Required]
        public string AccessMode { get; set; } = string.Empty;
    }
}
