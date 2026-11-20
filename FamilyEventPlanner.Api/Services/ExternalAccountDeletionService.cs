using System.Security.Cryptography;
using System.Text;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Services;

public enum ExternalAccountDeletionRequestResult
{
    Accepted,
    Unavailable
}

public enum ExternalAccountDeletionVerificationResult
{
    Deleted,
    InvalidOrExpired,
    UnableToComplete,
    ProcessingFailed
}

public interface IExternalAccountDeletionService
{
    Task<ExternalAccountDeletionRequestResult> RequestAsync(string email, CancellationToken cancellationToken);

    Task<ExternalAccountDeletionVerificationResult> VerifyAsync(string token, CancellationToken cancellationToken);
}

public sealed class ExternalAccountDeletionService : IExternalAccountDeletionService
{
    private readonly AppDbContext _context;
    private readonly IAccountDeletionService _accountDeletionService;
    private readonly IEmailSender _emailSender;
    private readonly IExternalAccountDeletionEmailQueue _emailQueue;
    private readonly ILogger<ExternalAccountDeletionService> _logger;
    private readonly Uri? _verificationUrl;
    private readonly int _tokenLifetimeMinutes;

    public ExternalAccountDeletionService(
        AppDbContext context,
        IAccountDeletionService accountDeletionService,
        IEmailSender emailSender,
        IExternalAccountDeletionEmailQueue emailQueue,
        IConfiguration configuration,
        ILogger<ExternalAccountDeletionService> logger)
    {
        _context = context;
        _accountDeletionService = accountDeletionService;
        _emailSender = emailSender;
        _emailQueue = emailQueue;
        _logger = logger;

        var configuredUrl = configuration["AccountDeletion:VerificationUrl"];
        if (Uri.TryCreate(configuredUrl, UriKind.Absolute, out var verificationUrl) &&
            verificationUrl.Scheme == Uri.UriSchemeHttps &&
            string.IsNullOrEmpty(verificationUrl.Query) &&
            string.IsNullOrEmpty(verificationUrl.Fragment))
        {
            _verificationUrl = verificationUrl;
        }

        _tokenLifetimeMinutes = configuration.GetValue<int?>("AccountDeletion:VerificationTokenLifetimeMinutes") ?? 30;
        if (_tokenLifetimeMinutes < 1 || _tokenLifetimeMinutes > 1440)
        {
            throw new InvalidOperationException(
                "AccountDeletion:VerificationTokenLifetimeMinutes must be between 1 and 1440.");
        }
    }

    public async Task<ExternalAccountDeletionRequestResult> RequestAsync(
        string email,
        CancellationToken cancellationToken)
    {
        if (!_emailSender.IsConfigured || _verificationUrl is null)
            return ExternalAccountDeletionRequestResult.Unavailable;

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _context.Users.SingleOrDefaultAsync(
            candidate => candidate.Email == normalizedEmail,
            cancellationToken);
        if (user is null || string.IsNullOrWhiteSpace(user.PasswordHash))
            return ExternalAccountDeletionRequestResult.Accepted;

        var now = DateTime.UtcNow;
        var existingToken = await _context.AccountDeletionVerificationTokens
            .SingleOrDefaultAsync(
                token => token.UserId == user.Id && token.UsedAtUtc == null,
                cancellationToken);
        if (existingToken is not null && existingToken.ExpiresAtUtc > now)
            return ExternalAccountDeletionRequestResult.Accepted;

        if (existingToken is not null)
        {
            _context.AccountDeletionVerificationTokens.Remove(existingToken);
            try
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                _logger.LogWarning("An expired external account deletion token could not be replaced.");
                return ExternalAccountDeletionRequestResult.Accepted;
            }
        }

        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var verificationToken = new AccountDeletionVerificationToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = HashToken(rawToken),
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddMinutes(_tokenLifetimeMinutes)
        };
        _context.AccountDeletionVerificationTokens.Add(verificationToken);

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            _logger.LogWarning("An external account deletion verification request could not be recorded.");
            return ExternalAccountDeletionRequestResult.Accepted;
        }

        var link = new UriBuilder(_verificationUrl)
        {
            Fragment = $"token={Uri.EscapeDataString(rawToken)}"
        }.Uri;
        var body =
            $"Use this secure link within {_tokenLifetimeMinutes} minutes to confirm deletion of your Huddle Up account:\n\n" +
            $"{link.AbsoluteUri}\n\n" +
            "If you did not request account deletion, you can ignore this email.";

        if (!_emailQueue.TryQueue(new ExternalAccountDeletionEmail(
                verificationToken.Id,
                user.Email,
                "Confirm Huddle Up account deletion",
                body)))
        {
            verificationToken.UsedAtUtc = DateTime.UtcNow;
            try
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                _logger.LogWarning("A queued external account deletion email could not invalidate its token.");
            }

            _logger.LogWarning("An external account deletion verification email could not be queued.");
        }

        return ExternalAccountDeletionRequestResult.Accepted;
    }

    public async Task<ExternalAccountDeletionVerificationResult> VerifyAsync(
        string token,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length != 64)
            return ExternalAccountDeletionVerificationResult.InvalidOrExpired;

        var tokenHash = HashToken(token);
        var verificationToken = await _context.AccountDeletionVerificationTokens
            .SingleOrDefaultAsync(
                candidate => candidate.TokenHash == tokenHash &&
                             candidate.UsedAtUtc == null &&
                             candidate.ExpiresAtUtc > DateTime.UtcNow,
                cancellationToken);
        if (verificationToken is null)
            return ExternalAccountDeletionVerificationResult.InvalidOrExpired;

        verificationToken.UsedAtUtc = DateTime.UtcNow;
        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return ExternalAccountDeletionVerificationResult.InvalidOrExpired;
        }
        catch (DbUpdateException exception)
        {
            _logger.LogError(
                "External account deletion verification could not consume a token ({FailureType}).",
                exception.GetType().Name);
            return ExternalAccountDeletionVerificationResult.ProcessingFailed;
        }

        try
        {
            var deletionResult = await _accountDeletionService.DeleteVerifiedAsync(
                verificationToken.UserId,
                cancellationToken);
            return deletionResult switch
            {
                AccountDeletionResult.Deleted => ExternalAccountDeletionVerificationResult.Deleted,
                AccountDeletionResult.LastAdministrator => ExternalAccountDeletionVerificationResult.UnableToComplete,
                _ => ExternalAccountDeletionVerificationResult.InvalidOrExpired
            };
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogError(
                "External account deletion failed after verification ({FailureType}).",
                exception.GetType().Name);
            return ExternalAccountDeletionVerificationResult.ProcessingFailed;
        }
    }

    private static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
