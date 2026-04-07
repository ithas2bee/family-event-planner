using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    // Minimal user placeholder for planned auth integration.
    public class User
    {
        public Guid Id { get; set; }

        [Required, EmailAddress]
        public string Email { get; set; }

        // Store password hash when you implement authentication.
        public string? PasswordHash { get; set; }

        public string? DisplayName { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
