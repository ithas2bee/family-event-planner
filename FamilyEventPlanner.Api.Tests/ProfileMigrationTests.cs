using FamilyEventPlanner.Api.Migrations;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;

namespace FamilyEventPlanner.Api.Tests;

public class ProfileMigrationTests
{
    [Fact]
    public void ProfileMigrationAddsEveryProfileColumnUsedByTheController()
    {
        var migrationBuilder = new MigrationBuilder("Microsoft.EntityFrameworkCore.SqlServer");
        new TestableProfileMigration().ApplyUp(migrationBuilder);

        var columns = migrationBuilder.Operations
            .OfType<AddColumnOperation>()
            .Where(operation => operation.Table == "Users")
            .Select(operation => operation.Name)
            .OrderBy(name => name)
            .ToArray();

        Assert.Equal(
            new[] { "Age", "Bio", "Location", "ProfilePictureUrl", "RolesJson" }.OrderBy(name => name),
            columns);
    }

    private sealed class TestableProfileMigration : AddUserProfileFields
    {
        public void ApplyUp(MigrationBuilder migrationBuilder) => Up(migrationBuilder);
    }
}
