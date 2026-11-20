using FamilyEventPlanner.Api.Models.Auth;
using FamilyEventPlanner.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FamilyEventPlanner.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/account-deletion")]
public sealed class ExternalAccountDeletionController : ControllerBase
{
    private readonly IExternalAccountDeletionService _deletionService;

    public ExternalAccountDeletionController(IExternalAccountDeletionService deletionService)
    {
        _deletionService = deletionService;
    }

    [HttpPost("requests")]
    [EnableRateLimiting("password-recovery")]
    public async Task<IActionResult> Request(
        [FromBody] ExternalAccountDeletionRequest request,
        CancellationToken cancellationToken)
    {
        const string message =
            "If an account exists for that email address, check that inbox for a verification link. If you do not receive one, try again later.";
        var result = await _deletionService.RequestAsync(request.Email, cancellationToken);
        return result switch
        {
            ExternalAccountDeletionRequestResult.Accepted => Accepted(new { message }),
            _ => StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Account deletion requests are temporarily unavailable. Please try again later."
            })
        };
    }

    [HttpPost("verify")]
    [EnableRateLimiting("password-recovery")]
    public async Task<IActionResult> Verify(
        [FromBody] VerifyExternalAccountDeletionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _deletionService.VerifyAsync(request.Token, cancellationToken);
        return result switch
        {
            ExternalAccountDeletionVerificationResult.Deleted =>
                Ok(new { message = "Your Huddle Up account has been deleted." }),
            ExternalAccountDeletionVerificationResult.InvalidOrExpired =>
                BadRequest(new
                {
                    message = "This link is invalid, expired, or already used. Submit a new deletion request."
                }),
            ExternalAccountDeletionVerificationResult.UnableToComplete =>
                Conflict(new
                {
                    message = "We could not complete this request. Please contact Huddle Up support."
                }),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "We could not process this request. Please submit a new deletion request."
            })
        };
    }
}
