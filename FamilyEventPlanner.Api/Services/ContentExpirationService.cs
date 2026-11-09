using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace FamilyEventPlanner.Api.Services;

public sealed class ContentExpirationProcessor
{
    private readonly AppDbContext _context;

    public ContentExpirationProcessor(AppDbContext context)
    {
        _context = context;
    }

    public async Task ProcessAsync(DateTime utcNow, CancellationToken cancellationToken = default)
    {
        utcNow = utcNow.Kind == DateTimeKind.Utc
            ? utcNow
            : DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
        IDbContextTransaction? transaction = _context.Database.IsRelational()
            ? await _context.Database.BeginTransactionAsync(cancellationToken)
            : null;

        try
        {
            await SendExpirationNotificationsAsync(utcNow, cancellationToken);
            await DeleteExpiredContentAsync(utcNow, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            if (transaction != null)
                await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            if (transaction != null)
                await transaction.RollbackAsync(cancellationToken);
            throw;
        }
        finally
        {
            if (transaction != null)
                await transaction.DisposeAsync();
        }
    }

    private async Task SendExpirationNotificationsAsync(DateTime utcNow, CancellationToken cancellationToken)
    {
        var warningTime = utcNow.AddHours(24);
        var polls = await _context.Polls
            .Where(p => p.CreatedByMemberId.HasValue &&
                !p.ExpirationNotificationSent &&
                p.ExpiresAt.HasValue &&
                p.ExpiresAt.Value > utcNow &&
                p.ExpiresAt.Value <= warningTime)
            .ToListAsync(cancellationToken);

        foreach (var poll in polls)
        {
            var question = poll.Question.Length <= 350 ? poll.Question : $"{poll.Question[..347]}...";
            _context.Notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                MemberId = poll.CreatedByMemberId!.Value,
                Message = $"Your poll \"{question}\" is about to expire. Extend it by 48 hours from this notification.",
                Type = "PollExpiring",
                Link = $"/poll/{poll.Id}",
                IsRead = false,
                CreatedAt = utcNow
            });
            poll.ExpirationNotificationSent = true;
        }

        var announcements = await _context.Announcements
            .Where(a => a.CreatedByMemberId.HasValue &&
                !a.ExpirationNotificationSent &&
                a.ExpiresAt.HasValue &&
                a.ExpiresAt.Value > utcNow &&
                a.ExpiresAt.Value <= warningTime)
            .ToListAsync(cancellationToken);

        foreach (var announcement in announcements)
        {
            _context.Notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                MemberId = announcement.CreatedByMemberId!.Value,
                Message = $"Your announcement \"{announcement.Title}\" is about to expire. Extend it by 48 hours from this notification.",
                Type = "AnnouncementExpiring",
                Link = $"/announcement/{announcement.Id}",
                IsRead = false,
                CreatedAt = utcNow
            });
            announcement.ExpirationNotificationSent = true;
        }
    }

    private async Task DeleteExpiredContentAsync(DateTime utcNow, CancellationToken cancellationToken)
    {
        var expiredPolls = await _context.Polls
            .Where(p => !p.ExpiresAt.HasValue || p.ExpiresAt.Value <= utcNow)
            .ToListAsync(cancellationToken);
        foreach (var poll in expiredPolls)
        {
            var options = await _context.PollOptions.Where(option => option.PollId == poll.Id).ToListAsync(cancellationToken);
            var optionIds = options.Select(option => option.Id).ToArray();
            var votes = await _context.PollVotes
                .Where(vote => optionIds.Contains(vote.PollOptionId))
                .ToListAsync(cancellationToken);
            _context.PollVotes.RemoveRange(votes);
            _context.PollOptions.RemoveRange(options);
            _context.ActivityFeed.RemoveRange(await _context.ActivityFeed
                .Where(activity => activity.RelatedEntityType == "Poll" && activity.RelatedEntityId == poll.Id)
                .ToListAsync(cancellationToken));
            _context.Notifications.RemoveRange(await _context.Notifications
                .Where(notification => notification.Link == $"/poll/{poll.Id}")
                .ToListAsync(cancellationToken));
            _context.Polls.Remove(poll);
        }

        var expiredAnnouncements = await _context.Announcements
            .Where(announcement => !announcement.ExpiresAt.HasValue || announcement.ExpiresAt.Value <= utcNow)
            .ToListAsync(cancellationToken);
        foreach (var announcement in expiredAnnouncements)
        {
            _context.ActivityFeed.RemoveRange(await _context.ActivityFeed
                .Where(activity => activity.RelatedEntityType == "Announcement" && activity.RelatedEntityId == announcement.Id)
                .ToListAsync(cancellationToken));
            _context.Notifications.RemoveRange(await _context.Notifications
                .Where(notification => notification.Link == $"/announcement/{announcement.Id}")
                .ToListAsync(cancellationToken));
            _context.Announcements.Remove(announcement);
        }
    }
}

public sealed class ContentExpirationHostedService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(15);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ContentExpirationHostedService> _logger;

    public ContentExpirationHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<ContentExpirationHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var processor = scope.ServiceProvider.GetRequiredService<ContentExpirationProcessor>();
                await processor.ProcessAsync(DateTime.UtcNow, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Content expiration processing failed; it will be retried.");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }
}
