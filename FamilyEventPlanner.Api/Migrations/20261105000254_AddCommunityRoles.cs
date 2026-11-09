using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyEventPlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCommunityRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CommunityRoleId",
                table: "GroupMembers",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CommunityRoles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FamilyGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommunityRoles", x => x.Id);
                    table.UniqueConstraint("AK_CommunityRoles_Id_FamilyGroupId", x => new { x.Id, x.FamilyGroupId });
                    table.ForeignKey(
                        name: "FK_CommunityRoles_FamilyGroups_FamilyGroupId",
                        column: x => x.FamilyGroupId,
                        principalTable: "FamilyGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GroupMembers_CommunityRoleId_FamilyGroupId",
                table: "GroupMembers",
                columns: new[] { "CommunityRoleId", "FamilyGroupId" });

            migrationBuilder.CreateIndex(
                name: "IX_CommunityRoles_FamilyGroupId_Name",
                table: "CommunityRoles",
                columns: new[] { "FamilyGroupId", "Name" },
                unique: true,
                filter: "[IsActive] = 1");

            migrationBuilder.AddForeignKey(
                name: "FK_GroupMembers_CommunityRoles_CommunityRoleId_FamilyGroupId",
                table: "GroupMembers",
                columns: new[] { "CommunityRoleId", "FamilyGroupId" },
                principalTable: "CommunityRoles",
                principalColumns: new[] { "Id", "FamilyGroupId" });

            migrationBuilder.Sql(
                """
                INSERT INTO CommunityRoles (Id, FamilyGroupId, Name, IsDefault, IsActive, CreatedAt, UpdatedAt)
                SELECT NEWID(), groups.Id, defaults.Name, 1, 1, SYSUTCDATETIME(), SYSUTCDATETIME()
                FROM FamilyGroups AS groups
                CROSS APPLY (
                    SELECT CASE
                        WHEN groups.GroupType = N'Family' THEN 0
                        WHEN groups.GroupType = N'Alumni' THEN 1
                        WHEN groups.GroupType = N'Sports & Fitness' THEN 2
                        WHEN groups.GroupType = N'Parents & Kids' THEN 3
                        WHEN groups.GroupType = N'School & Education' THEN 4
                        WHEN groups.GroupType = N'Work & Professional' THEN 5
                        WHEN groups.GroupType = N'Neighborhood & Local' THEN 6
                        WHEN groups.GroupType = N'Support & Care' THEN 7
                        ELSE 8
                    END AS RoleSet
                ) AS community
                INNER JOIN (VALUES
                    (0, N'Mom'), (0, N'Dad'), (0, N'Aunt'), (0, N'Uncle'), (0, N'Cousin'),
                    (0, N'Grandparent'), (0, N'Child'), (0, N'Sibling'), (0, N'Friend'), (0, N'Other'),
                    (1, N'Graduate'), (1, N'Alumni'), (1, N'Faculty'), (1, N'Former Student'),
                    (2, N'Coach'), (2, N'Player'), (2, N'Team Manager'), (2, N'Supporter'),
                    (3, N'Parent'), (3, N'Child'), (3, N'Guardian'), (3, N'Caregiver'),
                    (4, N'Student'), (4, N'Teacher'), (4, N'Faculty'), (4, N'Organizer'),
                    (5, N'Employee'), (5, N'Manager'), (5, N'Organizer'),
                    (6, N'Resident'), (6, N'Volunteer'), (6, N'Organizer'),
                    (7, N'Member'), (7, N'Caregiver'), (7, N'Supporter'), (7, N'Moderator'),
                    (8, N'Member'), (8, N'Moderator'), (8, N'Organizer')
                ) AS defaults(RoleSet, Name) ON defaults.RoleSet = community.RoleSet;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GroupMembers_CommunityRoles_CommunityRoleId_FamilyGroupId",
                table: "GroupMembers");

            migrationBuilder.DropTable(
                name: "CommunityRoles");

            migrationBuilder.DropIndex(
                name: "IX_GroupMembers_CommunityRoleId_FamilyGroupId",
                table: "GroupMembers");

            migrationBuilder.DropColumn(
                name: "CommunityRoleId",
                table: "GroupMembers");
        }
    }
}
