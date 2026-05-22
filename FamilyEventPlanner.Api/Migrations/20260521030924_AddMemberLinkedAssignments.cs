using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyEventPlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMemberLinkedAssignments : Migration
    {
        private readonly Guid UnknownGuestUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        private const string UnknownGuestEmail = "system.unknownguest@familyeventplanner.internal";
        private const string UnknownGuestDisplayName = "Unknown Guest";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Step 1: Create system User for Unknown Guest if it doesn't exist
            migrationBuilder.Sql($@"
                IF NOT EXISTS (SELECT 1 FROM Users WHERE Id = '{UnknownGuestUserId}')
                BEGIN
                    INSERT INTO Users (Id, Email, DisplayName, CreatedAt, PasswordHash, GoogleId, FacebookId, LastLoginAt)
                    VALUES (
                        '{UnknownGuestUserId}',
                        '{UnknownGuestEmail}',
                        '{UnknownGuestDisplayName}',
                        GETUTCDATE(),
                        NULL,
                        NULL,
                        NULL,
                        NULL
                    )
                END
            ");

            // Step 2: Create Unknown Guest GroupMember for each FamilyGroup
            migrationBuilder.Sql($@"
                INSERT INTO GroupMembers (Id, FamilyGroupId, UserId, IsAdmin, JoinedAt)
                SELECT 
                    NEWID(),
                    fg.Id,
                    '{UnknownGuestUserId}',
                    0,
                    GETUTCDATE()
                FROM FamilyGroups fg
                WHERE NOT EXISTS (
                    SELECT 1 
                    FROM GroupMembers gm 
                    WHERE gm.FamilyGroupId = fg.Id 
                    AND gm.UserId = '{UnknownGuestUserId}'
                )
            ");

            // Step 3: Update existing EventAssignment rows with NULL AssignedToId
            // Point them to the Unknown Guest member for their event's group
            migrationBuilder.Sql($@"
                UPDATE ea
                SET ea.AssignedToId = ug.Id
                FROM EventAssignments ea
                INNER JOIN FamilyEvents fe ON ea.FamilyEventId = fe.Id
                INNER JOIN GroupMembers ug ON ug.FamilyGroupId = fe.FamilyGroupId
                WHERE ea.AssignedToId IS NULL
                AND ug.UserId = '{UnknownGuestUserId}'
            ");

            // Step 4: Make AssignedToId NOT NULL (all assignments now have a member)
            migrationBuilder.AlterColumn<Guid>(
                name: "AssignedToId",
                table: "EventAssignments",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: Guid.Empty,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Step 1: Make AssignedToId nullable again
            migrationBuilder.AlterColumn<Guid>(
                name: "AssignedToId",
                table: "EventAssignments",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            // Step 2: Set AssignedToId to NULL for assignments pointing to Unknown Guest
            migrationBuilder.Sql($@"
                UPDATE ea
                SET ea.AssignedToId = NULL
                FROM EventAssignments ea
                INNER JOIN GroupMembers gm ON ea.AssignedToId = gm.Id
                WHERE gm.UserId = '{UnknownGuestUserId}'
            ");

            // Step 3: Delete Unknown Guest GroupMembers (optional - keeps data clean)
            migrationBuilder.Sql($@"
                DELETE FROM GroupMembers
                WHERE UserId = '{UnknownGuestUserId}'
            ");

            // Note: We intentionally do NOT delete the system User in case other data references it
        }
    }
}
