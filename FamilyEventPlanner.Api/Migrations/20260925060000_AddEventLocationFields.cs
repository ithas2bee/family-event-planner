using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyEventPlanner.Api.Migrations
{
    public partial class AddEventLocationFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LocationName",
                table: "FamilyEvents",
                type: "nvarchar(max)",
                nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "LocationAddress",
                table: "FamilyEvents",
                type: "nvarchar(max)",
                nullable: true);
            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "FamilyEvents",
                type: "float",
                nullable: true);
            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "FamilyEvents",
                type: "float",
                nullable: true);
            migrationBuilder.AddColumn<string>(
                name: "PlaceId",
                table: "FamilyEvents",
                type: "nvarchar(max)",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "LocationName", table: "FamilyEvents");
            migrationBuilder.DropColumn(name: "LocationAddress", table: "FamilyEvents");
            migrationBuilder.DropColumn(name: "Latitude", table: "FamilyEvents");
            migrationBuilder.DropColumn(name: "Longitude", table: "FamilyEvents");
            migrationBuilder.DropColumn(name: "PlaceId", table: "FamilyEvents");
        }
    }
}
