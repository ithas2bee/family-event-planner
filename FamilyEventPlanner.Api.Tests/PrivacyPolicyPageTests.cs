namespace FamilyEventPlanner.Api.Tests;

public sealed class PrivacyPolicyPageTests
{
    [Fact]
    public void PublicPolicyPageCoversCurrentDataHandlingAndChoices()
    {
        var pagePath = Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "../../../../FamilyEventPlanner.Api/wwwroot/privacy/index.html"));
        var page = File.ReadAllText(pagePath);

        Assert.Contains("Huddle Up Privacy Policy", page);
        Assert.Contains("Your date of birth is used to check registration age eligibility and is not saved", page);
        Assert.Contains("does not collect device GPS location", page);
        Assert.Contains("Google Places", page);
        Assert.Contains("Resend", page);
        Assert.Contains("Settings &gt; Delete Account", page);
        Assert.Contains("href=\"/delete-account\"", page);
        Assert.Contains("scheduled for removal after 30 days", page);
        Assert.Contains("mailto:lencrerotl0@gmail.com", page);
        Assert.Contains("do not include an advertising, analytics, or crash-reporting SDK", page);
    }

    [Fact]
    public void PrivacyRouteServesStaticPolicyBeforeAuthentication()
    {
        var programPath = Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "../../../../FamilyEventPlanner.Api/Program.cs"));
        var program = File.ReadAllText(programPath);

        Assert.Contains("context.Request.Path == \"/privacy\"", program);
        Assert.Contains("context.Request.Path = \"/privacy/index.html\"", program);
        Assert.Contains("app.UseAuthentication()", program);
        Assert.True(program.IndexOf("app.UseStaticFiles()", StringComparison.Ordinal) <
                    program.IndexOf("app.UseAuthentication()", StringComparison.Ordinal));
    }
}
