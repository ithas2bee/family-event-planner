using System.Security.Claims;
using System.Text.Json;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/profile")]
public sealed class ProfileController : ControllerBase
{
    private static readonly HashSet<string> AllowedRoles = new(StringComparer.Ordinal)
    {
        "Mom", "Dad", "Aunt", "Uncle", "Cousin", "Grandparent", "Sibling", "Friend", "Other"
    };

    private readonly AppDbContext _context;

    public ProfileController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<ProfileResponse>> Get()
    {
        var user = await FindCurrentUser();
        if (user is null)
            return Unauthorized();

        return Ok(await ToResponse(user));
    }

    [HttpPut]
    public async Task<ActionResult<ProfileResponse>> Update(UpdateProfileRequest request)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var user = await FindCurrentUser();
        if (user is null)
            return Unauthorized();

        var roles = (request.Roles ?? new List<string>())
            .Where(role => !string.IsNullOrWhiteSpace(role))
            .Select(role => role.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToList();
        if (roles.Any(role => !AllowedRoles.Contains(role)))
            return BadRequest(new { message = "One or more roles are not supported." });

        user.DisplayName = string.IsNullOrWhiteSpace(request.Name) ? null : request.Name.Trim();
        user.Age = request.Age;
        user.Location = Clean(request.Location);
        user.Bio = Clean(request.Bio);
        user.ProfilePictureUrl = Clean(request.ProfilePictureUrl);
        user.RolesJson = JsonSerializer.Serialize(roles);

        await _context.SaveChangesAsync();
        return Ok(await ToResponse(user));
    }

    private async Task<User?> FindCurrentUser()
    {
        var rawUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(rawUserId, out var userId)
            ? await _context.Users.FirstOrDefaultAsync(user => user.Id == userId)
            : null;
    }

    private async Task<ProfileResponse> ToResponse(User user)
    {
        var familyNames = await _context.GroupMembers
            .Where(member => member.UserId == user.Id)
            .Select(member => member.FamilyGroup.Name)
            .Distinct()
            .ToListAsync();

        return new ProfileResponse
        {
            Name = user.DisplayName,
            Email = user.Email,
            Age = user.Age,
            Location = user.Location,
            Bio = user.Bio,
            ProfilePictureUrl = user.ProfilePictureUrl,
            Roles = ParseRoles(user.RolesJson),
            FamilyNames = familyNames
        };
    }

    private static IReadOnlyList<string> ParseRoles(string? rolesJson)
    {
        if (string.IsNullOrWhiteSpace(rolesJson))
            return Array.Empty<string>();

        try
        {
            return JsonSerializer.Deserialize<List<string>>(rolesJson)?
                .Where(role => AllowedRoles.Contains(role))
                .Distinct(StringComparer.Ordinal)
                .ToArray() ?? Array.Empty<string>();
        }
        catch (JsonException)
        {
            return Array.Empty<string>();
        }
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
