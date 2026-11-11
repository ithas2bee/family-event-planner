using System.Text.RegularExpressions;
using FamilyEventPlanner.Api.Migrations;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;

namespace FamilyEventPlanner.Api.Tests;

public class CommunityRoleDefaultsMigrationTests
{
    [Fact]
    public void MigrationReusesMatchingActiveAndInactiveRolesAcrossAllCommunityTypes()
    {
        var migrationBuilder = new MigrationBuilder("Microsoft.EntityFrameworkCore.SqlServer");
        new TestableMigration().ApplyUp(migrationBuilder);

        var sql = Regex.Replace(
            migrationBuilder.Operations.OfType<SqlOperation>().Single().Sql,
            @"\s+",
            " ");
        var updateStart = sql.IndexOf("UPDATE role SET IsActive = 1, IsDefault = 1", StringComparison.Ordinal);
        var insertStart = sql.IndexOf("INSERT INTO CommunityRoles", updateStart, StringComparison.Ordinal);
        var customRolesStart = sql.IndexOf("CREATE TABLE #ExcessCommunityCustomRoles", insertStart, StringComparison.Ordinal);
        var matchingRoleUpdate = sql[updateStart..insertStart];
        var missingRoleInsert = sql[insertStart..customRolesStart];

        Assert.DoesNotContain("role.IsActive", matchingRoleUpdate);
        Assert.DoesNotContain("role.IsActive", missingRoleInsert);

        var defaultsStart = sql.IndexOf("INSERT INTO #CommunityRoleDefaults", StringComparison.Ordinal);
        var defaultsEnd = sql.IndexOf("; UPDATE role", defaultsStart, StringComparison.Ordinal);
        var defaultRows = Regex.Matches(
            sql[defaultsStart..defaultsEnd],
            @"\(N'(?<type>[^']+)', N'(?<name>[^']+)'\)")
            .Select(match => (Type: match.Groups["type"].Value, Name: match.Groups["name"].Value))
            .ToArray();

        Assert.Equal(64, defaultRows.Length);
        Assert.Equal(defaultRows.Length, defaultRows.Distinct().Count());
        Assert.Equal(16, defaultRows.Select(row => row.Type).Distinct().Count());
        Assert.All(
            defaultRows.GroupBy(row => row.Type),
            communityType => Assert.Equal(4, communityType.Count()));
        Assert.Single(defaultRows, row => row.Type == "Other" && row.Name == "Coordinator");
        Assert.Equal(
            3,
            Regex.Matches(
                sql,
                @"LEFT JOIN \( SELECT DISTINCT GroupType FROM #CommunityRoleDefaults \) AS knownType").Count);
        Assert.Contains("WHERE RoleRank > 4", sql);
    }

    private sealed class TestableMigration : AddCommunityRoleAssignmentsAndDefaultRoles
    {
        public void ApplyUp(MigrationBuilder migrationBuilder) => Up(migrationBuilder);
    }
}
