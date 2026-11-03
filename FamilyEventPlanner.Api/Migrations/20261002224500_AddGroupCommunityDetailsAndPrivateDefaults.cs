using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyEventPlanner.Api.Migrations
{
    public partial class AddGroupCommunityDetailsAndPrivateDefaults : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "FamilyGroups",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GroupType",
                table: "FamilyGroups",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "Other");

            migrationBuilder.AddColumn<bool>(
                name: "IsInviteOnly",
                table: "FamilyGroups",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsSearchable",
                table: "FamilyGroups",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Description", table: "FamilyGroups");
            migrationBuilder.DropColumn(name: "GroupType", table: "FamilyGroups");
            migrationBuilder.DropColumn(name: "IsInviteOnly", table: "FamilyGroups");
            migrationBuilder.DropColumn(name: "IsSearchable", table: "FamilyGroups");
        }
    }
}
