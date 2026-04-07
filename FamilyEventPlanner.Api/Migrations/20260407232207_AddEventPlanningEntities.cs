using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyEventPlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEventPlanningEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "InviteCode",
                table: "FamilyGroups",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateTable(
                name: "Announcements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FamilyGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Body = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedByMemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Announcements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Announcements_FamilyGroups_FamilyGroupId",
                        column: x => x.FamilyGroupId,
                        principalTable: "FamilyGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Announcements_GroupMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "GroupMembers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "FamilyEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FamilyGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Location = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DressCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedByMemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FamilyEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FamilyEvents_FamilyGroups_FamilyGroupId",
                        column: x => x.FamilyGroupId,
                        principalTable: "FamilyGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FamilyEvents_GroupMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "GroupMembers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Message = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Link = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notifications_GroupMembers_MemberId",
                        column: x => x.MemberId,
                        principalTable: "GroupMembers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EventAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FamilyEventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    QuantityNeeded = table.Column<int>(type: "int", nullable: false),
                    AssignedToId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Category = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EventAssignments_FamilyEvents_FamilyEventId",
                        column: x => x.FamilyEventId,
                        principalTable: "FamilyEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EventAssignments_GroupMembers_AssignedToId",
                        column: x => x.AssignedToId,
                        principalTable: "GroupMembers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "EventAttendances",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FamilyEventId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Rsvp = table.Column<int>(type: "int", nullable: false),
                    ArrivalTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DepartureTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    GuestCount = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventAttendances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EventAttendances_FamilyEvents_FamilyEventId",
                        column: x => x.FamilyEventId,
                        principalTable: "FamilyEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EventAttendances_GroupMembers_MemberId",
                        column: x => x.MemberId,
                        principalTable: "GroupMembers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Photos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FamilyGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FamilyEventId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UploadedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FilePath = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    Caption = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UploadedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Photos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Photos_FamilyEvents_FamilyEventId",
                        column: x => x.FamilyEventId,
                        principalTable: "FamilyEvents",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Photos_FamilyGroups_FamilyGroupId",
                        column: x => x.FamilyGroupId,
                        principalTable: "FamilyGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Photos_GroupMembers_UploadedById",
                        column: x => x.UploadedById,
                        principalTable: "GroupMembers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Polls",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FamilyEventId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    FamilyGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Question = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CreatedByMemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Polls", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Polls_FamilyEvents_FamilyEventId",
                        column: x => x.FamilyEventId,
                        principalTable: "FamilyEvents",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Polls_FamilyGroups_FamilyGroupId",
                        column: x => x.FamilyGroupId,
                        principalTable: "FamilyGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Polls_GroupMembers_CreatedByMemberId",
                        column: x => x.CreatedByMemberId,
                        principalTable: "GroupMembers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PollOptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PollId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Text = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PollOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PollOptions_Polls_PollId",
                        column: x => x.PollId,
                        principalTable: "Polls",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PollVotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PollOptionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PollVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PollVotes_GroupMembers_MemberId",
                        column: x => x.MemberId,
                        principalTable: "GroupMembers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PollVotes_PollOptions_PollOptionId",
                        column: x => x.PollOptionId,
                        principalTable: "PollOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_CreatedByMemberId",
                table: "Announcements",
                column: "CreatedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_FamilyGroupId",
                table: "Announcements",
                column: "FamilyGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_EventAssignments_AssignedToId",
                table: "EventAssignments",
                column: "AssignedToId");

            migrationBuilder.CreateIndex(
                name: "IX_EventAssignments_FamilyEventId",
                table: "EventAssignments",
                column: "FamilyEventId");

            migrationBuilder.CreateIndex(
                name: "IX_EventAttendances_FamilyEventId",
                table: "EventAttendances",
                column: "FamilyEventId");

            migrationBuilder.CreateIndex(
                name: "IX_EventAttendances_MemberId",
                table: "EventAttendances",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_FamilyEvents_CreatedByMemberId",
                table: "FamilyEvents",
                column: "CreatedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_FamilyEvents_FamilyGroupId",
                table: "FamilyEvents",
                column: "FamilyGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_MemberId",
                table: "Notifications",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_Photos_FamilyEventId",
                table: "Photos",
                column: "FamilyEventId");

            migrationBuilder.CreateIndex(
                name: "IX_Photos_FamilyGroupId",
                table: "Photos",
                column: "FamilyGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_Photos_UploadedById",
                table: "Photos",
                column: "UploadedById");

            migrationBuilder.CreateIndex(
                name: "IX_PollOptions_PollId",
                table: "PollOptions",
                column: "PollId");

            migrationBuilder.CreateIndex(
                name: "IX_Polls_CreatedByMemberId",
                table: "Polls",
                column: "CreatedByMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_Polls_FamilyEventId",
                table: "Polls",
                column: "FamilyEventId");

            migrationBuilder.CreateIndex(
                name: "IX_Polls_FamilyGroupId",
                table: "Polls",
                column: "FamilyGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_PollVotes_MemberId",
                table: "PollVotes",
                column: "MemberId");

            migrationBuilder.CreateIndex(
                name: "IX_PollVotes_PollOptionId",
                table: "PollVotes",
                column: "PollOptionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Announcements");

            migrationBuilder.DropTable(
                name: "EventAssignments");

            migrationBuilder.DropTable(
                name: "EventAttendances");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "Photos");

            migrationBuilder.DropTable(
                name: "PollVotes");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "PollOptions");

            migrationBuilder.DropTable(
                name: "Polls");

            migrationBuilder.DropTable(
                name: "FamilyEvents");

            migrationBuilder.AlterColumn<string>(
                name: "InviteCode",
                table: "FamilyGroups",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);
        }
    }
}
