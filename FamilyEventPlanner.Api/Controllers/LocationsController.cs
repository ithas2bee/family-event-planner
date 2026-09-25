using FamilyEventPlanner.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FamilyEventPlanner.Api.Controllers;

[ApiController]
[Route("api/locations")]
[Authorize(AuthenticationSchemes = "MemberId")]
public sealed class LocationsController : ControllerBase
{
    private readonly IGooglePlacesService _places;

    public LocationsController(IGooglePlacesService places) => _places = places;

    [HttpGet("autocomplete")]
    public async Task<IActionResult> Autocomplete([FromQuery] string input, [FromQuery] string sessionToken, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(input) || string.IsNullOrWhiteSpace(sessionToken))
            return BadRequest(new { message = "Input and session token are required." });
        return Ok(await _places.AutocompleteAsync(input.Trim(), sessionToken, cancellationToken));
    }

    [HttpGet("details/{placeId}")]
    public async Task<IActionResult> Details(string placeId, [FromQuery] string sessionToken, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(placeId) || string.IsNullOrWhiteSpace(sessionToken))
            return BadRequest(new { message = "Place ID and session token are required." });
        var details = await _places.GetDetailsAsync(placeId, sessionToken, cancellationToken);
        return details == null ? NotFound(new { message = "Location details are unavailable." }) : Ok(details);
    }
}
