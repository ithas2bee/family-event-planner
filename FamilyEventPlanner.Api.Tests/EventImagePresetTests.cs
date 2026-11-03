using System.ComponentModel.DataAnnotations;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Tests;

public class EventImagePresetTests
{
    [Fact]
    public void ExactlyEighteenPresetKeysAreSupported()
    {
        Assert.Equal(18, EventImagePresets.SupportedKeys.Count);
        Assert.Equal(EventImagePresets.SupportedKeys.Count, EventImagePresets.SupportedKeys.Distinct().Count());
        Assert.Equal(new[]
        {
            "family-picnic",
            "birthday-party",
            "family-dinner",
            "game-night",
            "outdoor-adventure",
            "sports-day",
            "beach-day",
            "holiday-gathering",
            "arts-and-crafts",
            "backyard-bbq",
            "cruise-event",
            "camping-trip",
            "movie-night",
            "pool-party",
            "mall-outing",
            "sip-and-paint",
            "water-party",
            "kids-park"
        }, EventImagePresets.SupportedKeys);
    }

    [Theory]
    [MemberData(nameof(SupportedKeys))]
    public void CreateRequestAcceptsSupportedPreset(string key)
    {
        var request = new CreateEventRequest { EventImagePresetKey = key };

        Assert.True(ValidatePreset(request));
    }

    [Fact]
    public void CreateRequestAcceptsNoPreset()
    {
        var request = new CreateEventRequest();

        Assert.True(ValidatePreset(request));
    }

    [Fact]
    public void CreateRequestRejectsUnsupportedPreset()
    {
        var request = new CreateEventRequest { EventImagePresetKey = "not-a-preset" };

        Assert.False(ValidatePreset(request));
    }

    [Fact]
    public void UpdateRequestTracksAnExplicitNullWithoutTreatingAnOmittedKeyAsAnUpdate()
    {
        var omitted = new UpdateEventRequest();
        var cleared = new UpdateEventRequest { EventImagePresetKey = null };

        Assert.False(omitted.EventImagePresetKeySpecified);
        Assert.True(cleared.EventImagePresetKeySpecified);
        Assert.True(ValidatePreset(cleared));
    }

    [Fact]
    public void EventImagePresetKeyIsNullableAndLimitedToFortyCharactersInDatabaseModel()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var context = new AppDbContext(options);

        var property = context.Model
            .FindEntityType(typeof(FamilyEvent))!
            .FindProperty(nameof(FamilyEvent.EventImagePresetKey));

        Assert.NotNull(property);
        Assert.True(property!.IsNullable);
        Assert.Equal(40, property.GetMaxLength());
    }

    public static IEnumerable<object[]> SupportedKeys() =>
        EventImagePresets.SupportedKeys.Select(key => new object[] { key });

    private static bool ValidatePreset(CreateEventRequest request) =>
        Validator.TryValidateProperty(
            request.EventImagePresetKey,
            new ValidationContext(request) { MemberName = nameof(CreateEventRequest.EventImagePresetKey) },
            new List<ValidationResult>());

    private static bool ValidatePreset(UpdateEventRequest request) =>
        Validator.TryValidateProperty(
            request.EventImagePresetKey,
            new ValidationContext(request) { MemberName = nameof(UpdateEventRequest.EventImagePresetKey) },
            new List<ValidationResult>());
}
