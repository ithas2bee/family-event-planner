using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class Kickback
    {
        public Guid Id { get; set; }

        [Required]
        public Guid FamilyGroupId { get; set; }
        public FamilyGroup FamilyGroup { get; set; }

        public Guid? CreatedByMemberId { get; set; }
        public GroupMember? CreatedByMember { get; set; }

        // Casual vibe description (e.g., "BBQ", "Watching the game", "Pool open")
        [Required, MaxLength(100)]
        public string Vibe { get; set; }

        // Optional casual note
        [MaxLength(500)]
        public string? Note { get; set; }

        // When this kickback expires
        public DateTime ExpiresAtUtc { get; set; }

        // Can be manually cancelled
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAtUtc { get; set; }
    }
}
