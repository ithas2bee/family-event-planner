using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace FamilyEventPlanner.Api.Services;

public record PlaceSuggestion(string PlaceId, string Description);
public record PlaceDetails(string PlaceId, string Name, string Address, double Latitude, double Longitude);

public interface IGooglePlacesService
{
    Task<IReadOnlyList<PlaceSuggestion>> AutocompleteAsync(string input, string sessionToken, CancellationToken cancellationToken);
    Task<PlaceDetails?> GetDetailsAsync(string placeId, string sessionToken, CancellationToken cancellationToken);
}

public sealed class GooglePlacesService : IGooglePlacesService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GooglePlacesService> _logger;

    public GooglePlacesService(HttpClient httpClient, IConfiguration configuration, ILogger<GooglePlacesService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<IReadOnlyList<PlaceSuggestion>> AutocompleteAsync(string input, string sessionToken, CancellationToken cancellationToken)
    {
        var key = _configuration["GooglePlaces:ApiKey"];
        if (string.IsNullOrWhiteSpace(key)) return [];
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://places.googleapis.com/v1/places:autocomplete")
        {
            Content = JsonContent.Create(new { input, sessionToken })
        };
        request.Headers.Add("X-Goog-Api-Key", key);
        request.Headers.Add("X-Goog-FieldMask", "suggestions.placePrediction.placeId,suggestions.placePrediction.text");
        try
        {
            using var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode) return [];
            var payload = await response.Content.ReadFromJsonAsync<AutocompleteResponse>(cancellationToken);
            return payload?.Suggestions?
                .Where(item => item.PlacePrediction?.PlaceId != null)
                .Select(item => new PlaceSuggestion(item.PlacePrediction!.PlaceId!, item.PlacePrediction.Text?.Text ?? string.Empty))
                .ToList() ?? [];
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(exception, "Google Places autocomplete failed.");
            return [];
        }
    }

    public async Task<PlaceDetails?> GetDetailsAsync(string placeId, string sessionToken, CancellationToken cancellationToken)
    {
        var key = _configuration["GooglePlaces:ApiKey"];
        if (string.IsNullOrWhiteSpace(key)) return null;
        using var request = new HttpRequestMessage(HttpMethod.Get, $"https://places.googleapis.com/v1/places/{Uri.EscapeDataString(placeId)}");
        request.Headers.Add("X-Goog-Api-Key", key);
        request.Headers.Add("X-Goog-FieldMask", "id,displayName,formattedAddress,location");
        try
        {
            using var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode) return null;
            var payload = await response.Content.ReadFromJsonAsync<PlaceDetailsResponse>(cancellationToken);
            return payload?.Location == null ? null : new PlaceDetails(
                payload.Id ?? placeId,
                payload.DisplayName?.Text ?? string.Empty,
                payload.FormattedAddress ?? string.Empty,
                payload.Location.Latitude,
                payload.Location.Longitude);
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(exception, "Google Places details lookup failed.");
            return null;
        }
    }

    private sealed class AutocompleteResponse
    {
        [JsonPropertyName("suggestions")] public List<Suggestion>? Suggestions { get; set; }
    }
    private sealed class Suggestion
    {
        [JsonPropertyName("placePrediction")] public Prediction? PlacePrediction { get; set; }
    }
    private sealed class Prediction
    {
        [JsonPropertyName("placeId")] public string? PlaceId { get; set; }
        [JsonPropertyName("text")] public TextValue? Text { get; set; }
    }
    private sealed class TextValue
    {
        [JsonPropertyName("text")] public string? Text { get; set; }
    }
    private sealed class PlaceDetailsResponse
    {
        [JsonPropertyName("id")] public string? Id { get; set; }
        [JsonPropertyName("displayName")] public TextValue? DisplayName { get; set; }
        [JsonPropertyName("formattedAddress")] public string? FormattedAddress { get; set; }
        [JsonPropertyName("location")] public Coordinates? Location { get; set; }
    }
    private sealed class Coordinates
    {
        [JsonPropertyName("latitude")] public double Latitude { get; set; }
        [JsonPropertyName("longitude")] public double Longitude { get; set; }
    }
}
