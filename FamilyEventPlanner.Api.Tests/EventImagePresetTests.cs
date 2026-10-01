using System.ComponentModel.DataAnnotations;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Tests;

public class EventImagePresetTests
{
    [Fact]
    public void ExactlyTenPresetKeysAreSupported()
    {
        Assert.Equal(10, EventImagePresets.SupportedKeys.Count);
        Assert.Equal(EventImagePresets.SupportedKeys.Count, EventImagePresets.SupportedKeys.Distinct().Count());
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
