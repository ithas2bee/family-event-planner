using System.Threading.Channels;
using FamilyEventPlanner.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Services;

public sealed record ExternalAccountDeletionEmail(
    Guid VerificationTokenId,
    string Recipient,
    string Subject,
    string Body);

public interface IExternalAccountDeletionEmailQueue
{
    bool TryQueue(ExternalAccountDeletionEmail email);
}

public sealed class ExternalAccountDeletionEmailQueue : IExternalAccountDeletionEmailQueue
{
    private readonly Channel<ExternalAccountDeletionEmail> _channel =
        Channel.CreateBounded<ExternalAccountDeletionEmail>(new BoundedChannelOptions(100)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = true,
            SingleWriter = false
        });

    public bool TryQueue(ExternalAccountDeletionEmail email) =>
        _channel.Writer.TryWrite(email);

    internal IAsyncEnumerable<ExternalAccountDeletionEmail> ReadAllAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAllAsync(cancellationToken);
}

public sealed class ExternalAccountDeletionEmailDispatcher : BackgroundService
{
    private readonly ExternalAccountDeletionEmailQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ExternalAccountDeletionEmailDispatcher> _logger;

    public ExternalAccountDeletionEmailDispatcher(
        ExternalAccountDeletionEmailQueue queue,
        IServiceScopeFactory scopeFactory,
        ILogger<ExternalAccountDeletionEmailDispatcher> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var email in _queue.ReadAllAsync(stoppingToken))
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            try
            {
                await scope.ServiceProvider.GetRequiredService<IEmailSender>()
                    .SendAsync(email.Recipient, email.Subject, email.Body);
            }
            catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogWarning(
                    "External account deletion email delivery failed ({FailureType}).",
                    exception.GetType().Name);
                await InvalidateTokenAsync(scope.ServiceProvider, email.VerificationTokenId, stoppingToken);
            }
        }
    }

    private async Task InvalidateTokenAsync(
        IServiceProvider services,
        Guid tokenId,
        CancellationToken cancellationToken)
    {
        try
        {
            var context = services.GetRequiredService<AppDbContext>();
            var token = await context.AccountDeletionVerificationTokens
                .SingleOrDefaultAsync(candidate => candidate.Id == tokenId, cancellationToken);
            if (token is null)
                return;

            token.UsedAtUtc = DateTime.UtcNow;
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(
                "A failed external account deletion email could not invalidate its token ({FailureType}).",
                exception.GetType().Name);
        }
    }
}
