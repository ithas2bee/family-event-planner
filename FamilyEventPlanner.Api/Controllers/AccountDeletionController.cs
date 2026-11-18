using System.Security.Claims;
using FamilyEventPlanner.Api.Models.Auth;
using FamilyEventPlanner.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FamilyEventPlanner.Api.Controllers;

[ApiController]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
[Route("api/account")]
public sealed class AccountDeletionController : ControllerBase
{
    private readonly IAccountDeletionService _accountDeletionService;

    public AccountDeletionController(IAccountDeletionService accountDeletionService)
    {
        _accountDeletionService = accountDeletionService;
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(
        [FromBody] DeleteAccountRequest request,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(request.Confirmation, "DELETE", StringComparison.Ordinal))
            return BadRequest(new { message = "Type DELETE to confirm account deletion." });

        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            return Unauthorized();

        var result = await _accountDeletionService.DeleteAsync(userId, request.Password, cancellationToken);
        return result switch
        {
            AccountDeletionResult.Deleted => Ok(new { status = "deleted" }),
            AccountDeletionResult.InvalidPassword =>
                Unauthorized(new { message = "The password is incorrect." }),
            AccountDeletionResult.LastAdministrator =>
                Conflict(new { message = "Assign another community administrator before deleting your account." }),
            AccountDeletionResult.SystemAccount => Forbid(),
            _ => Unauthorized()
        };
    }
}
