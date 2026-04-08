using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class CreateFamilyGroupRequest
    {
        [Required, MaxLength(200)]
        public string Name { get; set; }
    }
}
