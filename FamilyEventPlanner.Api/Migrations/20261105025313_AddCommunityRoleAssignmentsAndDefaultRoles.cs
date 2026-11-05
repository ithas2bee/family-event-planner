using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyEventPlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCommunityRoleAssignmentsAndDefaultRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddUniqueConstraint(
                name: "AK_GroupMembers_Id_FamilyGroupId",
                table: "GroupMembers",
                columns: new[] { "Id", "FamilyGroupId" });

            migrationBuilder.CreateTable(
                name: "CommunityRoleAssignments",
                columns: table => new
                {
                    GroupMemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CommunityRoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FamilyGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommunityRoleAssignments", x => new { x.GroupMemberId, x.CommunityRoleId });
                    table.ForeignKey(
                        name: "FK_CommunityRoleAssignments_CommunityRoles_CommunityRoleId_FamilyGroupId",
                        columns: x => new { x.CommunityRoleId, x.FamilyGroupId },
                        principalTable: "CommunityRoles",
                        principalColumns: new[] { "Id", "FamilyGroupId" });
                    table.ForeignKey(
                        name: "FK_CommunityRoleAssignments_GroupMembers_GroupMemberId_FamilyGroupId",
                        columns: x => new { x.GroupMemberId, x.FamilyGroupId },
                        principalTable: "GroupMembers",
                        principalColumns: new[] { "Id", "FamilyGroupId" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CommunityRoleAssignments_CommunityRoleId_FamilyGroupId",
                table: "CommunityRoleAssignments",
                columns: new[] { "CommunityRoleId", "FamilyGroupId" });

            migrationBuilder.CreateIndex(
                name: "IX_CommunityRoleAssignments_FamilyGroupId_CommunityRoleId",
                table: "CommunityRoleAssignments",
                columns: new[] { "FamilyGroupId", "CommunityRoleId" });

            migrationBuilder.CreateIndex(
                name: "IX_CommunityRoleAssignments_GroupMemberId_FamilyGroupId",
                table: "CommunityRoleAssignments",
                columns: new[] { "GroupMemberId", "FamilyGroupId" });

            migrationBuilder.Sql(
                """
                INSERT INTO CommunityRoleAssignments (FamilyGroupId, GroupMemberId, CommunityRoleId)
                SELECT member.FamilyGroupId, member.Id, member.CommunityRoleId
                FROM GroupMembers AS member
                INNER JOIN CommunityRoles AS role
                    ON role.Id = member.CommunityRoleId
                    AND role.FamilyGroupId = member.FamilyGroupId
                WHERE member.CommunityRoleId IS NOT NULL;

                CREATE TABLE #CommunityRoleDefaults (GroupType nvarchar(100) NOT NULL, Name nvarchar(50) NOT NULL);
                INSERT INTO #CommunityRoleDefaults (GroupType, Name) VALUES
                    (N'Family', N'Mom'), (N'Family', N'Dad'), (N'Family', N'Child'), (N'Family', N'Grandparent'),
                    (N'Friends', N'Friend'), (N'Friends', N'Best Friend'), (N'Friends', N'Host'), (N'Friends', N'Guest'),
                    (N'Couples', N'Partner 1'), (N'Couples', N'Partner 2'), (N'Couples', N'Couple Friend'), (N'Couples', N'Guest'),
                    (N'Parents & Kids', N'Parent'), (N'Parents & Kids', N'Child'), (N'Parents & Kids', N'Guardian'), (N'Parents & Kids', N'Caregiver'),
                    (N'Sports & Fitness', N'Coach'), (N'Sports & Fitness', N'Player'), (N'Sports & Fitness', N'Trainer'), (N'Sports & Fitness', N'Team Manager'),
                    (N'School & Education', N'Student'), (N'School & Education', N'Teacher'), (N'School & Education', N'Parent'), (N'School & Education', N'Staff'),
                    (N'Work & Professional', N'Employee'), (N'Work & Professional', N'Manager'), (N'Work & Professional', N'Team Lead'), (N'Work & Professional', N'Consultant'),
                    (N'Neighborhood & Local', N'Resident'), (N'Neighborhood & Local', N'Neighbor'), (N'Neighborhood & Local', N'Community Leader'), (N'Neighborhood & Local', N'Volunteer'),
                    (N'Hobbies & Interests', N'Enthusiast'), (N'Hobbies & Interests', N'Beginner'), (N'Hobbies & Interests', N'Expert'), (N'Hobbies & Interests', N'Instructor'),
                    (N'Faith & Spiritual', N'Faith Leader'), (N'Faith & Spiritual', N'Member'), (N'Faith & Spiritual', N'Volunteer'), (N'Faith & Spiritual', N'Ministry Leader'),
                    (N'Clubs & Organizations', N'President'), (N'Clubs & Organizations', N'Officer'), (N'Clubs & Organizations', N'Member'), (N'Clubs & Organizations', N'Volunteer'),
                    (N'Travel', N'Trip Organizer'), (N'Travel', N'Traveler'), (N'Travel', N'Travel Companion'), (N'Travel', N'Guest'),
                    (N'Alumni', N'Graduate'), (N'Alumni', N'Current Student'), (N'Alumni', N'Faculty'), (N'Alumni', N'Alumni Organizer'),
                    (N'Support & Care', N'Caregiver'), (N'Support & Care', N'Recipient'), (N'Support & Care', N'Support Volunteer'), (N'Support & Care', N'Coordinator'),
                    (N'Events & Social', N'Event Organizer'), (N'Events & Social', N'Host'), (N'Events & Social', N'Participant'), (N'Events & Social', N'Volunteer'),
                    (N'Other', N'Member'), (N'Other', N'Organizer'), (N'Other', N'Coordinator'), (N'Other', N'Guest');

                UPDATE role
                SET IsActive = 0, IsDefault = 0, UpdatedAt = SYSUTCDATETIME()
                FROM CommunityRoles AS role
                WHERE role.IsDefault = 1
                    AND NOT EXISTS (
                        SELECT 1
                        FROM FamilyGroups AS community
                        LEFT JOIN #CommunityRoleDefaults AS knownType ON knownType.GroupType = community.GroupType
                        INNER JOIN #CommunityRoleDefaults AS expected
                            ON expected.GroupType = COALESCE(knownType.GroupType, N'Other')
                            AND LOWER(expected.Name) = LOWER(role.Name)
                        WHERE community.Id = role.FamilyGroupId);

                UPDATE role
                SET IsActive = 1, IsDefault = 1, UpdatedAt = SYSUTCDATETIME()
                FROM CommunityRoles AS role
                INNER JOIN FamilyGroups AS community ON community.Id = role.FamilyGroupId
                LEFT JOIN #CommunityRoleDefaults AS knownType ON knownType.GroupType = community.GroupType
                INNER JOIN #CommunityRoleDefaults AS expected
                    ON expected.GroupType = COALESCE(knownType.GroupType, N'Other')
                    AND LOWER(expected.Name) = LOWER(role.Name)

                INSERT INTO CommunityRoles (Id, FamilyGroupId, Name, IsDefault, IsActive, CreatedAt, UpdatedAt)
                SELECT NEWID(), community.Id, expected.Name, 1, 1, SYSUTCDATETIME(), SYSUTCDATETIME()
                FROM FamilyGroups AS community
                LEFT JOIN #CommunityRoleDefaults AS knownType ON knownType.GroupType = community.GroupType
                INNER JOIN #CommunityRoleDefaults AS expected
                    ON expected.GroupType = COALESCE(knownType.GroupType, N'Other')
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM CommunityRoles AS role
                    WHERE role.FamilyGroupId = community.Id
                        AND LOWER(role.Name) = LOWER(expected.Name));

                CREATE TABLE #ExcessCommunityCustomRoles (Id uniqueidentifier NOT NULL PRIMARY KEY);
                WITH RankedCustomRoles AS (
                    SELECT role.Id,
                        ROW_NUMBER() OVER (
                            PARTITION BY role.FamilyGroupId
                            ORDER BY
                                (SELECT COUNT_BIG(*)
                                 FROM CommunityRoleAssignments AS assignment
                                 WHERE assignment.CommunityRoleId = role.Id) DESC,
                                role.CreatedAt,
                                role.Id) AS RoleRank
                    FROM CommunityRoles AS role
                    WHERE role.IsActive = 1 AND role.IsDefault = 0)
                INSERT INTO #ExcessCommunityCustomRoles (Id)
                SELECT Id FROM RankedCustomRoles WHERE RoleRank > 4;

                UPDATE role
                SET IsActive = 0, UpdatedAt = SYSUTCDATETIME()
                FROM CommunityRoles AS role
                INNER JOIN #ExcessCommunityCustomRoles AS excess ON excess.Id = role.Id;

                DELETE assignment
                FROM CommunityRoleAssignments AS assignment
                INNER JOIN #ExcessCommunityCustomRoles AS excess ON excess.Id = assignment.CommunityRoleId;

                UPDATE member
                SET CommunityRoleId = NULL
                FROM GroupMembers AS member
                INNER JOIN #ExcessCommunityCustomRoles AS excess ON excess.Id = member.CommunityRoleId;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CommunityRoleAssignments");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_GroupMembers_Id_FamilyGroupId",
                table: "GroupMembers");
        }
    }
}
