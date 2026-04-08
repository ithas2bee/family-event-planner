using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyEventPlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_EventAttendances_FamilyEventId",
                table: "EventAttendances");

            migrationBuilder.AlterColumn<string>(
                name: "InviteCode",
                table: "FamilyGroups",
                type: "nvarchar(450)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FamilyGroups_InviteCode",
                table: "FamilyGroups",
                column: "InviteCode",
                unique: true,
                filter: "[InviteCode] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_EventAttendances_FamilyEventId_MemberId",
                table: "EventAttendances",
                columns: new[] { "FamilyEventId", "MemberId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FamilyGroups_InviteCode",
                table: "FamilyGroups");

            migrationBuilder.DropIndex(
                name: "IX_EventAttendances_FamilyEventId_MemberId",
                table: "EventAttendances");

            migrationBuilder.AlterColumn<string>(
                name: "InviteCode",
                table: "FamilyGroups",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_EventAttendances_FamilyEventId",
                table: "EventAttendances",
                column: "FamilyEventId");
        }
    }
}
