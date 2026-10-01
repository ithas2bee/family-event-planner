using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyEventPlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEventImagePresetKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EventImagePresetKey",
                table: "FamilyEvents",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EventImagePresetKey",
                table: "FamilyEvents");
        }
    }
}
