using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyEventPlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AccountDeletionDisassociatesSharedRecords : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "UploadedById",
                table: "Photos",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AlterColumn<Guid>(
                name: "AssignedToId",
                table: "EventAssignments",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM Photos WHERE UploadedById IS NULL) OR
                   EXISTS (SELECT 1 FROM EventAssignments WHERE AssignedToId IS NULL)
                    THROW 51000, 'Cannot restore required ownership after account deletion.', 1;
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "UploadedById",
                table: "Photos",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "AssignedToId",
                table: "EventAssignments",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);
        }
    }
}
