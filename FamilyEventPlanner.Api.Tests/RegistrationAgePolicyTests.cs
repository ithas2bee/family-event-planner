using FamilyEventPlanner.Api.Services;

namespace FamilyEventPlanner.Api.Tests;

public class RegistrationAgePolicyTests
{
    private readonly RegistrationAgePolicy _policy = new(14);

    [Fact]
    public void EligibilityStartsOnFourteenthBirthday()
    {
        var currentDate = new DateOnly(2026, 11, 17);

        Assert.False(_policy.IsEligible(new DateOnly(2012, 11, 18), currentDate));
        Assert.True(_policy.IsEligible(new DateOnly(2012, 11, 17), currentDate));
        Assert.True(_policy.IsEligible(new DateOnly(2012, 11, 16), currentDate));
    }

    [Fact]
    public void LeapDayBirthdayReachesEligibilityOnFebruaryTwentyEighthInNonLeapYear()
    {
        var leapDayBirthday = new DateOnly(2012, 2, 29);

        Assert.False(_policy.IsEligible(leapDayBirthday, new DateOnly(2026, 2, 27)));
        Assert.True(_policy.IsEligible(leapDayBirthday, new DateOnly(2026, 2, 28)));
    }

    [Fact]
    public void RejectsFutureAndImplausiblyOldBirthDates()
    {
        Assert.False(_policy.IsValidDateOfBirth(new DateOnly(2026, 11, 18), new DateOnly(2026, 11, 17)));
        Assert.False(_policy.IsValidDateOfBirth(new DateOnly(1906, 11, 16), new DateOnly(2026, 11, 17)));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("2012-02-30")]
    [InlineData("2012/02/29")]
    public void DateOfBirthParsingRequiresARealIsoCalendarDate(string? value)
    {
        Assert.False(_policy.TryParseDateOfBirth(value, out _));
    }
}
