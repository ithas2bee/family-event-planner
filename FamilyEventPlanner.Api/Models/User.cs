using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    // User is the main account identity.
    public class User
    {
        public Guid Id { get; set; }

        [Required, EmailAddress]
        public string Email { get; set; }

        public string? PasswordHash { get; set; }

        public string? DisplayName { get; set; }

        public int? Age { get; set; }

        [MaxLength(160)]
        public string? Location { get; set; }

        [MaxLength(2000)]
        public string? Bio { get; set; }

        [MaxLength(1024)]
        public string? ProfilePictureUrl { get; set; }

        // Stored as JSON so a user can have more than one family role.
        public string? RolesJson { get; set; }

        public DateTime CreatedAt { get; set; }

        public string? GoogleId { get; set; }
        public string? FacebookId { get; set; }
        public DateTime? LastLoginAt { get; set; }
    }
}
