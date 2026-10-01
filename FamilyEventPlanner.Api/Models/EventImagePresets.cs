using System.ComponentModel.DataAnnotations;

namespace FamilyEventPlanner.Api.Models;

public static class EventImagePresets
{
    public static IReadOnlyList<string> SupportedKeys { get; } = Array.AsReadOnly(new[]
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
    });

    public static bool IsSupported(string key) => SupportedKeys.Contains(key, StringComparer.Ordinal);
}

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field)]
public sealed class EventImagePresetKeyAttribute : ValidationAttribute
{
    public override bool IsValid(object? value) =>
        value is null || value is string key && EventImagePresets.IsSupported(key);
}
