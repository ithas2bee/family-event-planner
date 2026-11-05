using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace FamilyEventPlanner.Api.Controllers;

[ApiController]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
[Route("api/familygroups/{groupId:guid}/roles")]
public sealed class CommunityRolesController : ControllerBase
{
    private readonly AppDbContext _context;

    public CommunityRolesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Get(Guid groupId)
    {
        if (!await _context.FamilyGroups.AnyAsync(group => group.Id == groupId))
            return NotFound();
        if (await GetCaller(groupId) is null)
            return Forbid();

        return Ok(await ActiveRoles(groupId));
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid groupId, CommunityRoleRequest request)
    {
        var authorization = await RequireAdmin(groupId);
        if (authorization is not null)
            return authorization;
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { message = "Role name is required." });
        if (await HasActiveRole(groupId, name))
            return Conflict(new { message = "A role with this name already exists in this community." });

        var now = DateTime.UtcNow;
        var role = new CommunityRole
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = groupId,
            Name = name,
            IsDefault = false,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };
        _context.CommunityRoles.Add(role);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { groupId }, role);
    }

    [HttpPut("{roleId:guid}")]
    public async Task<IActionResult> Update(Guid groupId, Guid roleId, CommunityRoleRequest request)
    {
        var authorization = await RequireAdmin(groupId);
        if (authorization is not null)
            return authorization;
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { message = "Role name is required." });

        var role = await _context.CommunityRoles.FirstOrDefaultAsync(item =>
            item.Id == roleId && item.FamilyGroupId == groupId && item.IsActive);
        if (role is null)
            return NotFound();
        if (await HasActiveRole(groupId, name, roleId))
            return Conflict(new { message = "A role with this name already exists in this community." });

        role.Name = name;
        role.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(role);
    }

    [HttpDelete("{roleId:guid}")]
    public async Task<IActionResult> Deactivate(Guid groupId, Guid roleId)
    {
        var authorization = await RequireAdmin(groupId);
        if (authorization is not null)
            return authorization;

        var role = await _context.CommunityRoles.FirstOrDefaultAsync(item =>
            item.Id == roleId && item.FamilyGroupId == groupId && item.IsActive);
        if (role is null)
            return NotFound();

        role.IsActive = false;
        role.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("defaults")]
    public async Task<IActionResult> RestoreDefaults(Guid groupId)
    {
        var authorization = await RequireAdmin(groupId);
        if (authorization is not null)
            return authorization;

        var now = DateTime.UtcNow;
        var existingRoles = await _context.CommunityRoles
            .Where(role => role.FamilyGroupId == groupId)
            .ToListAsync();
        foreach (var name in CommunityRoleDefaults.ForGroupType(
                     await _context.FamilyGroups.Where(group => group.Id == groupId)
                         .Select(group => group.GroupType).SingleAsync()))
        {
            var role = existingRoles.FirstOrDefault(item => item.IsActive &&
                string.Equals(item.Name, name, StringComparison.OrdinalIgnoreCase));
            if (role is not null)
            {
                role.IsDefault = true;
                continue;
            }

            role = existingRoles.FirstOrDefault(item => !item.IsActive &&
                string.Equals(item.Name, name, StringComparison.OrdinalIgnoreCase));
            if (role is null)
            {
                role = new CommunityRole
                {
                    Id = Guid.NewGuid(),
                    FamilyGroupId = groupId,
                    Name = name,
                    IsDefault = true,
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                existingRoles.Add(role);
                _context.CommunityRoles.Add(role);
            }
            else if (!role.IsActive)
            {
                role.IsActive = true;
                role.IsDefault = true;
                role.UpdatedAt = now;
            }
        }

        await _context.SaveChangesAsync();
        return Ok(await ActiveRoles(groupId));
    }

    private async Task<GroupMember?> GetCaller(Guid groupId)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            return null;
        return await _context.GroupMembers
            .FirstOrDefaultAsync(member => member.UserId == userId && member.FamilyGroupId == groupId);
    }

    private async Task<bool> IsAdmin(Guid groupId)
    {
        var caller = await GetCaller(groupId);
        return caller?.IsAdmin == true;
    }

    private async Task<IActionResult?> RequireAdmin(Guid groupId)
    {
        if (!await _context.FamilyGroups.AnyAsync(group => group.Id == groupId))
            return NotFound();
        return await IsAdmin(groupId) ? null : Forbid();
    }

    private async Task<bool> HasActiveRole(Guid groupId, string name, Guid? exceptRoleId = null)
    {
        var names = await _context.CommunityRoles
            .Where(role => role.FamilyGroupId == groupId && role.IsActive &&
                           (!exceptRoleId.HasValue || role.Id != exceptRoleId.Value))
            .Select(role => role.Name)
            .ToListAsync();
        return names.Contains(name, StringComparer.OrdinalIgnoreCase);
    }

    private Task<List<CommunityRole>> ActiveRoles(Guid groupId)
    {
        return _context.CommunityRoles
            .Where(role => role.FamilyGroupId == groupId && role.IsActive)
            .OrderByDescending(role => role.IsDefault)
            .ThenBy(role => role.Name)
            .ToListAsync();
    }
}
