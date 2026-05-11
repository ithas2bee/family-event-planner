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

        public DateTime CreatedAt { get; set; }

        public string? GoogleId { get; set; }
        public string? FacebookId { get; set; }
        public DateTime? LastLoginAt { get; set; }
    }
}
