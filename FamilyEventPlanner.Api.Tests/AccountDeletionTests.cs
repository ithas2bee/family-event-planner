using System.Security.Claims;
using FamilyEventPlanner.Api.Constants;
using FamilyEventPlanner.Api.Controllers;
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using FamilyEventPlanner.Api.Models.Auth;
using FamilyEventPlanner.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace FamilyEventPlanner.Api.Tests;

public sealed class AccountDeletionTests
{
    [Fact]
    public async Task DeleteRemovesPersonalRecordsAndDisassociatesSharedRecords()
    {
        await using var context = CreateContext();
        var target = CreateUser("target@example.com");
        var otherAdmin = CreateUser("admin@example.com");
        var group = new FamilyGroup { Id = Guid.NewGuid(), Name = "Community", CreatedAt = DateTime.UtcNow };
        var targetMember = CreateMember(target, group.Id);
        var adminMember = CreateMember(otherAdmin, group.Id, isAdmin: true);
        var familyEvent = new FamilyEvent
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            Title = "Shared event",
            StartDate = DateTime.UtcNow,
            CreatedByMemberId = targetMember.Id
        };
        var poll = new Poll
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            Question = "Shared poll",
            CreatedByMemberId = targetMember.Id,
            CreatedAt = DateTime.UtcNow,
            Options = [new PollOption { Id = Guid.NewGuid(), Text = "Option" }]
        };
        var kickback = new Kickback
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            Vibe = "Shared kickback",
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByMemberId = targetMember.Id
        };
        var announcement = new Announcement
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            Title = "Shared announcement",
            Body = "Community information",
            CreatedAt = DateTime.UtcNow,
            CreatedByMemberId = targetMember.Id
        };

        context.Users.AddRange(target, otherAdmin);
        context.FamilyGroups.Add(group);
        context.GroupMembers.AddRange(targetMember, adminMember);
        context.FamilyEvents.Add(familyEvent);
        context.EventAssignments.Add(new EventAssignment
        {
            Id = Guid.NewGuid(),
            FamilyEventId = familyEvent.Id,
            Title = "Bring food",
            AssignedToId = targetMember.Id,
            Status = AssignmentStatus.Assigned
        });
        context.EventAttendances.Add(new EventAttendance
        {
            Id = Guid.NewGuid(),
            FamilyEventId = familyEvent.Id,
            MemberId = targetMember.Id
        });
        context.Polls.Add(poll);
        context.PollVotes.Add(new PollVote
        {
            Id = Guid.NewGuid(),
            PollOptionId = poll.Options.Single().Id,
            MemberId = targetMember.Id,
            CreatedAt = DateTime.UtcNow
        });
        context.Announcements.Add(announcement);
        context.Photos.Add(new Photo
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            UploadedById = targetMember.Id,
            FilePath = "shared/photo.jpg",
            Caption = "Shared photo",
            UploadedAt = DateTime.UtcNow
        });
        context.Kickbacks.Add(kickback);
        context.KickbackResponses.Add(new KickbackResponse
        {
            Id = Guid.NewGuid(),
            KickbackId = kickback.Id,
            MemberId = targetMember.Id,
            ResponseType = "Maybe",
            CreatedAtUtc = DateTime.UtcNow
        });
        context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            MemberId = targetMember.Id,
            Message = "Private notification",
            CreatedAt = DateTime.UtcNow
        });
        context.ActivityFeed.Add(new ActivityFeed
        {
            Id = Guid.NewGuid(),
            FamilyGroupId = group.Id,
            ActorMemberId = targetMember.Id,
            ActivityType = "EventCreated",
            MetadataJson = "{\"title\":\"Shared event\"}",
            CreatedAtUtc = DateTime.UtcNow
        });
        context.PasswordResetTokens.Add(new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = target.Id,
            TokenHash = "hashed-token",
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(30)
        });
        context.GroupMembershipRequests.Add(new GroupMembershipRequest
        {
            Id = Guid.NewGuid(),
            UserId = target.Id,
            FamilyGroupId = Guid.NewGuid(),
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var result = await new AccountDeletionService(context)
            .DeleteAsync(target.Id, "current-password", CancellationToken.None);

        Assert.Equal(AccountDeletionResult.Deleted, result);
        Assert.False(await context.Users.AnyAsync(user => user.Id == target.Id));
        Assert.False(await context.GroupMembers.AnyAsync(member => member.Id == targetMember.Id));
        Assert.Empty(await context.PasswordResetTokens.ToListAsync());
        Assert.Empty(await context.GroupMembershipRequests.ToListAsync());
        Assert.Empty(await context.EventAttendances.ToListAsync());
        Assert.Empty(await context.PollVotes.ToListAsync());
        Assert.Empty(await context.KickbackResponses.ToListAsync());
        Assert.Empty(await context.Notifications.ToListAsync());
        Assert.Equal(group.Id, (await context.FamilyGroups.SingleAsync()).Id);
        Assert.Null((await context.FamilyEvents.SingleAsync()).CreatedByMemberId);
        Assert.Null((await context.Polls.SingleAsync()).CreatedByMemberId);
        Assert.Null((await context.Announcements.SingleAsync()).CreatedByMemberId);
        Assert.Null((await context.Kickbacks.SingleAsync()).CreatedByMemberId);
        Assert.Null((await context.ActivityFeed.SingleAsync()).ActorMemberId);
        Assert.Null((await context.ActivityFeed.SingleAsync()).MetadataJson);
        var photo = await context.Photos.SingleAsync();
        Assert.Null(photo.UploadedById);
        Assert.Equal("shared/photo.jpg", photo.FilePath);
        var assignment = await context.EventAssignments.SingleAsync();
        Assert.Null(assignment.AssignedToId);
        Assert.Equal(AssignmentStatus.Needed, assignment.Status);
    }

    [Fact]
    public async Task DeleteRequiresPasswordAndDoesNotDeleteLastAdministrator()
    {
        await using var context = CreateContext();
        var target = CreateUser("admin@example.com");
        var group = new FamilyGroup { Id = Guid.NewGuid(), Name = "Community", CreatedAt = DateTime.UtcNow };
        var admin = CreateMember(target, group.Id, isAdmin: true);
        context.Users.Add(target);
        context.FamilyGroups.Add(group);
        context.GroupMembers.Add(admin);
        await context.SaveChangesAsync();
        var service = new AccountDeletionService(context);

        var wrongPassword = await service.DeleteAsync(target.Id, "wrong", CancellationToken.None);
        var lastAdmin = await service.DeleteAsync(target.Id, "current-password", CancellationToken.None);

        Assert.Equal(AccountDeletionResult.InvalidPassword, wrongPassword);
        Assert.Equal(AccountDeletionResult.LastAdministrator, lastAdmin);
        Assert.True(await context.Users.AnyAsync(user => user.Id == target.Id));
        Assert.True(await context.GroupMembers.AnyAsync(member => member.Id == admin.Id));
    }

    [Fact]
    public async Task DeleteUsesAuthenticatedSubjectAndRequiresExplicitConfirmation()
    {
        await using var context = CreateContext();
        var target = CreateUser("target@example.com");
        var anotherUser = CreateUser("another@example.com");
        context.Users.AddRange(target, anotherUser);
        await context.SaveChangesAsync();
        var controller = new AccountDeletionController(new AccountDeletionService(context));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    [new Claim(ClaimTypes.NameIdentifier, target.Id.ToString())],
                    "Bearer"))
            }
        };

        var invalidConfirmation = await controller.Delete(
            new DeleteAccountRequest { Password = "current-password", Confirmation = "delete" },
            CancellationToken.None);
        var deleted = await controller.Delete(
            new DeleteAccountRequest { Password = "current-password", Confirmation = "DELETE" },
            CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(invalidConfirmation);
        Assert.IsType<OkObjectResult>(deleted);
        Assert.False(await context.Users.AnyAsync(user => user.Id == target.Id));
        Assert.True(await context.Users.AnyAsync(user => user.Id == anotherUser.Id));
    }

    [Fact]
    public async Task DeletedAccountsNoLongerPassJwtAccountValidationAndDeletionCanBeRetried()
    {
        await using var context = CreateContext();
        var user = CreateUser("user@example.com");
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var validator = new ActiveAccountTokenValidator(context);

        Assert.True(await validator.IsActiveAsync(user.Id));
        var service = new AccountDeletionService(context);
        Assert.Equal(
            AccountDeletionResult.Deleted,
            await service.DeleteAsync(user.Id, "current-password", CancellationToken.None));
        Assert.False(await validator.IsActiveAsync(user.Id));
        Assert.Equal(
            AccountDeletionResult.AccountNotFound,
            await service.DeleteAsync(user.Id, "current-password", CancellationToken.None));
    }

    [Fact]
    public async Task SaveFailureLeavesPersistedAccountAndMembershipIntact()
    {
        var interceptor = new FailingSaveInterceptor();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .AddInterceptors(interceptor)
            .Options;
        var target = CreateUser("user@example.com");
        var group = new FamilyGroup { Id = Guid.NewGuid(), Name = "Community", CreatedAt = DateTime.UtcNow };
        var member = CreateMember(target, group.Id);
        await using (var seedContext = new AppDbContext(options))
        {
            interceptor.ShouldFail = false;
            seedContext.Users.Add(target);
            seedContext.FamilyGroups.Add(group);
            seedContext.GroupMembers.Add(member);
            await seedContext.SaveChangesAsync();
        }

        interceptor.ShouldFail = true;
        await using (var context = new AppDbContext(options))
        {
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                new AccountDeletionService(context)
                    .DeleteAsync(target.Id, "current-password", CancellationToken.None));
        }

        interceptor.ShouldFail = false;
        await using var verifyContext = new AppDbContext(options);
        Assert.True(await verifyContext.Users.AnyAsync(user => user.Id == target.Id));
        Assert.True(await verifyContext.GroupMembers.AnyAsync(groupMember => groupMember.Id == member.Id));
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static User CreateUser(string email)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = email.Split('@')[0],
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, "current-password");
        return user;
    }

    private static GroupMember CreateMember(User user, Guid groupId, bool isAdmin = false) => new()
    {
        Id = Guid.NewGuid(),
        FamilyGroupId = groupId,
        UserId = user.Id,
        User = user,
        IsAdmin = isAdmin,
        JoinedAt = DateTime.UtcNow
    };

    private sealed class FailingSaveInterceptor : SaveChangesInterceptor
    {
        public bool ShouldFail { get; set; }

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            return ShouldFail
                ? ValueTask.FromException<InterceptionResult<int>>(new InvalidOperationException("Save failed."))
                : ValueTask.FromResult(result);
        }
    }
}
