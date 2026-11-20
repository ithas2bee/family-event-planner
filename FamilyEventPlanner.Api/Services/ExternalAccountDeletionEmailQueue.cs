using System.Threading.Channels;
using FamilyEventPlanner.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Services;

public sealed record ExternalAccountDeletionEmailRequest(string Email);

public interface IExternalAccountDeletionEmailQueue
{
    bool TryQueue(ExternalAccountDeletionEmailRequest request);
}

public sealed class ExternalAccountDeletionEmailQueue : IExternalAccountDeletionEmailQueue
{
    private readonly Channel<ExternalAccountDeletionEmailRequest> _channel =
        Channel.CreateBounded<ExternalAccountDeletionEmailRequest>(new BoundedChannelOptions(100)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = true,
            SingleWriter = false
        });

    public bool TryQueue(ExternalAccountDeletionEmailRequest request) =>
        _channel.Writer.TryWrite(request);

    internal IAsyncEnumerable<ExternalAccountDeletionEmailRequest> ReadAllAsync(CancellationToken cancellationToken) =>
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
        await foreach (var request in _queue.ReadAllAsync(stoppingToken))
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            try
            {
                await scope.ServiceProvider.GetRequiredService<IExternalAccountDeletionService>()
                    .ProcessQueuedRequestAsync(request.Email, stoppingToken);
            }
            catch (Exception exception) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogWarning(
                    "External account deletion request processing failed ({FailureType}).",
                    exception.GetType().Name);
            }
        }
    }
}
