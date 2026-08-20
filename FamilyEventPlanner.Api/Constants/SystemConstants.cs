using System;

namespace FamilyEventPlanner.Api.Constants
{
    /// <summary>
    /// System-wide constants for reserved/sentinel entities
    /// </summary>
    public static class SystemConstants
    {
        /// <summary>
        /// Fixed GUID for the system-owned User account used for Unknown Guest members.
        /// This User represents non-group participants in events/assignments.
        /// </summary>
        public static readonly Guid UnknownGuestUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");

        /// <summary>
        /// Display name for Unknown Guest user
        /// </summary>
        public const string UnknownGuestDisplayName = "Unknown Guest";

        /// <summary>
        /// Email for system Unknown Guest user
        /// </summary>
        public const string UnknownGuestEmail = "system.unknownguest@familyeventplanner.internal";
    }
}
