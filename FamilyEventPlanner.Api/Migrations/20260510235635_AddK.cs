using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyEventPlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddK : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Kickbacks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FamilyGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedByMemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Vibe = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ExpiresAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Kickbacks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Kickbacks_FamilyGroups_FamilyGroupId",
                        column: x => x.FamilyGroupId,
                        principalTable: "FamilyGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Kickbacks_GroupMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "GroupMembers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "KickbackResponses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    KickbackId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ResponseType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KickbackResponses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KickbackResponses_GroupMembers_MemberId",
                        column: x => x.MemberId,
                        principalTable: "GroupMembers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_KickbackResponses_Kickbacks_KickbackId",
                        column: x => x.KickbackId,
                        principalTable: "Kickbacks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_KickbackResponses_KickbackId",
                table: "KickbackResponses",
                column: "KickbackId");

            migrationBuilder.CreateIndex(
                name: "IX_KickbackResponses_MemberId",
                table: "KickbackResponses",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_Kickbacks_CreatedByMemberId",
                table: "Kickbacks",
                column: "CreatedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_Kickbacks_FamilyGroupId",
                table: "Kickbacks",
                column: "FamilyGroupId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "KickbackResponses");

            migrationBuilder.DropTable(
                name: "Kickbacks");
        }
    }
}
