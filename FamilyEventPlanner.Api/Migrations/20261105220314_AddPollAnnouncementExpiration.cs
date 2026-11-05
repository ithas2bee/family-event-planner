using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyEventPlanner.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPollAnnouncementExpiration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ExpirationExtended",
                table: "Polls",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ExpirationNotificationSent",
                table: "Polls",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ExpirationExtended",
                table: "Announcements",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ExpirationNotificationSent",
                table: "Announcements",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql("""
                UPDATE Polls
                SET ExpiresAt = CASE
                    WHEN ExpiresAt IS NULL OR ExpiresAt > DATEADD(day, 14, CreatedAt) THEN DATEADD(day, 14, CreatedAt)
                    ELSE ExpiresAt
                END;

                UPDATE Announcements
                SET ExpiresAt = CASE
                    WHEN ExpiresAt IS NULL OR ExpiresAt > DATEADD(day, 14, CreatedAt) THEN DATEADD(day, 14, CreatedAt)
                    ELSE ExpiresAt
                END;

                DELETE FROM ActivityFeed
                WHERE RelatedEntityType = 'Poll'
                  AND RelatedEntityId IN (SELECT Id FROM Polls WHERE ExpiresAt <= SYSUTCDATETIME());

                DELETE FROM Notifications
                WHERE Link IN (
                    SELECT CONCAT('/poll/', CONVERT(nvarchar(36), Id))
                    FROM Polls
                    WHERE ExpiresAt <= SYSUTCDATETIME()
                );

                DELETE vote
                FROM PollVotes vote
                INNER JOIN PollOptions option ON option.Id = vote.PollOptionId
                INNER JOIN Polls poll ON poll.Id = option.PollId
                WHERE poll.ExpiresAt <= SYSUTCDATETIME();

                DELETE option
                FROM PollOptions option
                INNER JOIN Polls poll ON poll.Id = option.PollId
                WHERE poll.ExpiresAt <= SYSUTCDATETIME();

                DELETE FROM Polls WHERE ExpiresAt <= SYSUTCDATETIME();

                DELETE FROM ActivityFeed
                WHERE RelatedEntityType = 'Announcement'
                  AND RelatedEntityId IN (SELECT Id FROM Announcements WHERE ExpiresAt <= SYSUTCDATETIME());

                DELETE FROM Notifications
                WHERE Link IN (
                    SELECT CONCAT('/announcement/', CONVERT(nvarchar(36), Id))
                    FROM Announcements
                    WHERE ExpiresAt <= SYSUTCDATETIME()
                );

                DELETE FROM Announcements WHERE ExpiresAt <= SYSUTCDATETIME();
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Polls_ExpiresAt",
                table: "Polls",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_ExpiresAt",
                table: "Announcements",
                column: "ExpiresAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Polls_ExpiresAt",
                table: "Polls");

            migrationBuilder.DropIndex(
                name: "IX_Announcements_ExpiresAt",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "ExpirationExtended",
                table: "Polls");

            migrationBuilder.DropColumn(
                name: "ExpirationNotificationSent",
                table: "Polls");

            migrationBuilder.DropColumn(
                name: "ExpirationExtended",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "ExpirationNotificationSent",
                table: "Announcements");
        }
    }
}
