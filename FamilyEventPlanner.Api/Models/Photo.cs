using System;
using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models
{
    public class Photo
    {
        public Guid Id { get; set; }

        [Required]
        public Guid FamilyGroupId { get; set; }
        public FamilyGroup FamilyGroup { get; set; }

        public Guid? FamilyEventId { get; set; }
        public FamilyEvent? FamilyEvent { get; set; }

        [Required]
        // Use UploadedById to match EF conventions and avoid duplicate FK columns
        public Guid UploadedById { get; set; }
        public GroupMember UploadedBy { get; set; }

        [Required, MaxLength(1024)]
        public string FilePath { get; set; }

        public string? Caption { get; set; }

        public DateTime UploadedAt { get; set; }
    }
}
