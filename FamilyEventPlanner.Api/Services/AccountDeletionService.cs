using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FamilyEventPlanner.Api.Constants;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Services;

public enum AccountDeletionResult
{
    Deleted,
    AccountNotFound,
    InvalidPassword,
    LastAdministrator,
    SystemAccount
}

public interface IAccountDeletionService
{
    Task<AccountDeletionResult> DeleteAsync(Guid userId, string password, CancellationToken cancellationToken);
}

public sealed class AccountDeletionService : IAccountDeletionService
{
    private readonly AppDbContext _context;
    private readonly PasswordHasher<User> _passwordHasher = new();

    public AccountDeletionService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<AccountDeletionResult> DeleteAsync(
        Guid userId,
        string password,
        CancellationToken cancellationToken)
    {
        if (userId == SystemConstants.UnknownGuestUserId)
            return AccountDeletionResult.SystemAccount;

        await using var transaction = _context.Database.IsRelational()
            ? await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken)
            : null;

        var user = await _context.Users.SingleOrDefaultAsync(
            candidate => candidate.Id == userId,
            cancellationToken);
        if (user is null)
            return AccountDeletionResult.AccountNotFound;
        if (!VerifyPassword(user, password))
            return AccountDeletionResult.InvalidPassword;

        var memberships = await _context.GroupMembers
            .Where(member => member.UserId == userId)
            .ToListAsync(cancellationToken);
        foreach (var membership in memberships.Where(member => member.IsAdmin))
        {
            var hasAnotherAdministrator = await _context.GroupMembers.AnyAsync(
                member => member.FamilyGroupId == membership.FamilyGroupId &&
                          member.Id != membership.Id &&
                          member.IsAdmin,
                cancellationToken);
            if (!hasAnotherAdministrator)
                return AccountDeletionResult.LastAdministrator;
        }

        var memberIds = memberships.Select(member => member.Id).ToArray();
        _context.PasswordResetTokens.RemoveRange(await _context.PasswordResetTokens
            .Where(token => token.UserId == userId)
            .ToListAsync(cancellationToken));
        _context.GroupMembershipRequests.RemoveRange(await _context.GroupMembershipRequests
            .Where(request => request.UserId == userId)
            .ToListAsync(cancellationToken));

        if (memberIds.Length > 0)
        {
            _context.EventAttendances.RemoveRange(await _context.EventAttendances
                .Where(attendance => memberIds.Contains(attendance.MemberId))
                .ToListAsync(cancellationToken));
            _context.PollVotes.RemoveRange(await _context.PollVotes
                .Where(vote => memberIds.Contains(vote.MemberId))
                .ToListAsync(cancellationToken));
            _context.KickbackResponses.RemoveRange(await _context.KickbackResponses
                .Where(response => memberIds.Contains(response.MemberId))
                .ToListAsync(cancellationToken));
            _context.Notifications.RemoveRange(await _context.Notifications
                .Where(notification => memberIds.Contains(notification.MemberId))
                .ToListAsync(cancellationToken));
            _context.CommunityRoleAssignments.RemoveRange(await _context.CommunityRoleAssignments
                .Where(assignment => memberIds.Contains(assignment.GroupMemberId))
                .ToListAsync(cancellationToken));

            var assignments = await _context.EventAssignments
                .Where(assignment => assignment.AssignedToId.HasValue &&
                                     memberIds.Contains(assignment.AssignedToId.Value))
                .ToListAsync(cancellationToken);
            foreach (var assignment in assignments)
            {
                assignment.AssignedToId = null;
                if (assignment.Status == AssignmentStatus.Assigned)
                    assignment.Status = AssignmentStatus.Needed;
            }

            var photos = await _context.Photos
                .Where(photo => photo.UploadedById.HasValue &&
                                memberIds.Contains(photo.UploadedById.Value))
                .ToListAsync(cancellationToken);
            foreach (var photo in photos)
                photo.UploadedById = null;

            await DisassociateCreators(
                _context.FamilyEvents.Where(item => item.CreatedByMemberId.HasValue &&
                                                    memberIds.Contains(item.CreatedByMemberId.Value)),
                item => item.CreatedByMemberId = null,
                cancellationToken);
            await DisassociateCreators(
                _context.Polls.Where(item => item.CreatedByMemberId.HasValue &&
                                             memberIds.Contains(item.CreatedByMemberId.Value)),
                item => item.CreatedByMemberId = null,
                cancellationToken);
            await DisassociateCreators(
                _context.Announcements.Where(item => item.CreatedByMemberId.HasValue &&
                                                     memberIds.Contains(item.CreatedByMemberId.Value)),
                item => item.CreatedByMemberId = null,
                cancellationToken);
            await DisassociateCreators(
                _context.Kickbacks.Where(item => item.CreatedByMemberId.HasValue &&
                                                 memberIds.Contains(item.CreatedByMemberId.Value)),
                item => item.CreatedByMemberId = null,
                cancellationToken);

            var activities = await _context.ActivityFeed
                .Where(activity => activity.ActorMemberId.HasValue &&
                                   memberIds.Contains(activity.ActorMemberId.Value))
                .ToListAsync(cancellationToken);
            foreach (var activity in activities)
            {
                activity.ActorMemberId = null;
                activity.MetadataJson = null;
            }

            if (!string.IsNullOrWhiteSpace(user.DisplayName))
            {
                var groupIds = memberships.Select(member => member.FamilyGroupId).Distinct().ToArray();
                var groupActivities = await _context.ActivityFeed
                    .Where(activity => groupIds.Contains(activity.FamilyGroupId) &&
                                       activity.MetadataJson != null)
                    .ToListAsync(cancellationToken);
                foreach (var activity in groupActivities)
                {
                    if (ContainsDisplayName(activity.MetadataJson, user.DisplayName))
                        activity.MetadataJson = null;
                }
            }
        }

        _context.GroupMembers.RemoveRange(memberships);
        _context.Users.Remove(user);
        await _context.SaveChangesAsync(cancellationToken);
        if (transaction is not null)
            await transaction.CommitAsync(cancellationToken);

        return AccountDeletionResult.Deleted;
    }

    private bool VerifyPassword(User user, string password)
    {
        if (string.IsNullOrWhiteSpace(user.PasswordHash))
            return false;

        byte[] decoded;
        try
        {
            decoded = Convert.FromBase64String(user.PasswordHash);
        }
        catch (FormatException)
        {
            return FixedTimeEquals(user.PasswordHash, password);
        }

        if (decoded.Length >= 14 && decoded[0] == 1)
        {
            try
            {
                return _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password)
                    != PasswordVerificationResult.Failed;
            }
            catch (FormatException)
            {
                return false;
            }
        }

        if (decoded.Length == 49 && decoded[0] == 0)
        {
            return _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password)
                != PasswordVerificationResult.Failed;
        }

        return FixedTimeEquals(user.PasswordHash, password);
    }

    private static bool FixedTimeEquals(string left, string right)
    {
        var leftBytes = Encoding.UTF8.GetBytes(left);
        var rightBytes = Encoding.UTF8.GetBytes(right);
        return leftBytes.Length == rightBytes.Length &&
               CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
    }

    private static bool ContainsDisplayName(string? metadataJson, string displayName)
    {
        if (string.IsNullOrWhiteSpace(metadataJson))
            return false;

        try
        {
            using var document = JsonDocument.Parse(metadataJson);
            return document.RootElement.ValueKind == JsonValueKind.Object &&
                   document.RootElement.TryGetProperty("displayName", out var value) &&
                   value.ValueKind == JsonValueKind.String &&
                   string.Equals(value.GetString(), displayName, StringComparison.OrdinalIgnoreCase);
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static async Task DisassociateCreators<TEntity>(
        IQueryable<TEntity> records,
        Action<TEntity> clearCreatorId,
        CancellationToken cancellationToken)
        where TEntity : class
    {
        foreach (var record in await records.ToListAsync(cancellationToken))
            clearCreatorId(record);
    }
}
