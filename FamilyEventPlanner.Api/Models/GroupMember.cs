using System;
using System.ComponentModel.DataAnnotations;
using FamilyEventPlanner.Api.Constants;

namespace FamilyEventPlanner.Api.Models
{
    public class GroupMember
    {
        public Guid Id { get; set; }

        public Guid FamilyGroupId { get; set; }
        public FamilyGroup FamilyGroup { get; set; }

        // UserId is now required (not nullable)
        [Required]
        public Guid UserId { get; set; }
        public User User { get; set; }

        public bool IsAdmin { get; set; }

        public DateTime JoinedAt { get; set; }

        /// <summary>
        /// Returns true if this GroupMember is the system "Unknown Guest" member
        /// used for non-group participants in assignments.
        /// </summary>
        public bool IsUnknownGuest()
        {
            return UserId == SystemConstants.UnknownGuestUserId;
        }
    }
}
