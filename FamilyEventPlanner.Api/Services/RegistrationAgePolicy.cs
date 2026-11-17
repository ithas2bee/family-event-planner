using System.Globalization;

namespace FamilyEventPlanner.Api.Services;

public sealed class RegistrationAgePolicy
{
    private const int MaximumPlausibleAge = 120;
    private const string DateFormat = "yyyy-MM-dd";

    public RegistrationAgePolicy(int minimumAge)
    {
        if (minimumAge is < 1 or > MaximumPlausibleAge)
        {
            throw new ArgumentOutOfRangeException(nameof(minimumAge));
        }

        MinimumAge = minimumAge;
    }

    public int MinimumAge { get; }

    public bool TryParseDateOfBirth(string? value, out DateOnly dateOfBirth) =>
        DateOnly.TryParseExact(
            value,
            DateFormat,
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out dateOfBirth);

    public bool IsValidDateOfBirth(DateOnly dateOfBirth, DateOnly currentDate) =>
        dateOfBirth <= currentDate &&
        dateOfBirth >= currentDate.AddYears(-MaximumPlausibleAge);

    public bool IsEligible(DateOnly dateOfBirth, DateOnly currentDate) =>
        IsValidDateOfBirth(dateOfBirth, currentDate) &&
        dateOfBirth.AddYears(MinimumAge) <= currentDate;
}
