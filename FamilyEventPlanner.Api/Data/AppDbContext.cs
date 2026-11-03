using Microsoft.EntityFrameworkCore;
using FamilyEventPlanner.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FamilyEventPlanner.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<FamilyGroup> FamilyGroups { get; set; }
        public DbSet<GroupMember> GroupMembers { get; set; }
        public DbSet<GroupMembershipRequest> GroupMembershipRequests { get; set; }

        // Event planning entities
        public DbSet<FamilyEvent> FamilyEvents { get; set; }
        public DbSet<EventAssignment> EventAssignments { get; set; }
        public DbSet<EventAttendance> EventAttendances { get; set; }

        // Polls
        public DbSet<Poll> Polls { get; set; }
        public DbSet<PollOption> PollOptions { get; set; }
        public DbSet<PollVote> PollVotes { get; set; }

        // Communications
        public DbSet<Announcement> Announcements { get; set; }
        public DbSet<Photo> Photos { get; set; }

        // Notifications and users
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }

        // Activity feed
        public DbSet<ActivityFeed> ActivityFeed { get; set; }

        // Kickbacks
        public DbSet<Kickback> Kickbacks { get; set; }
        public DbSet<KickbackResponse> KickbackResponses { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<PasswordResetToken>()
                .Property(token => token.UsedAtUtc)
                .IsConcurrencyToken();

            modelBuilder.Entity<PasswordResetToken>()
                .HasOne<User>()
                .WithMany()
                .HasForeignKey(token => token.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PasswordResetToken>()
                .HasIndex(token => token.TokenHash)
                .IsUnique();

            modelBuilder.Entity<PasswordResetToken>()
                .HasIndex(token => token.UserId)
                .HasFilter("[UsedAtUtc] IS NULL")
                .IsUnique();

            // Prevent multiple cascade delete paths involving GroupMembers by setting NoAction (SQL: NO ACTION)
            modelBuilder.Entity<EventAttendance>()
                .HasOne(e => e.Member)
                .WithMany()
                .HasForeignKey(e => e.MemberId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Photo>()
                .HasOne(p => p.UploadedBy)
                .WithMany()
                .HasForeignKey(p => p.UploadedById)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<PollVote>()
                .HasOne(v => v.Member)
                .WithMany()
                .HasForeignKey(v => v.MemberId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<EventAssignment>()
                .HasOne(a => a.AssignedTo)
                .WithMany()
                .HasForeignKey(a => a.AssignedToId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Notification>()
                .HasOne(n => n.Member)
                .WithMany()
                .HasForeignKey(n => n.MemberId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<ActivityFeed>()
                .HasOne(a => a.ActorMember)
                .WithMany()
                .HasForeignKey(a => a.ActorMemberId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Kickback>()
                .HasOne(k => k.CreatedByMember)
                .WithMany()
                .HasForeignKey(k => k.CreatedByMemberId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<KickbackResponse>()
                .HasOne(kr => kr.Member)
                .WithMany()
                .HasForeignKey(kr => kr.MemberId)
                .OnDelete(DeleteBehavior.NoAction);

            // Align naming conventions for foreign keys if necessary
            modelBuilder.Entity<EventAssignment>()
                .Property<Guid>("AssignedToId");  // Changed to required (not nullable)

            modelBuilder.Entity<Photo>()
                .Property<Guid>("UploadedById");

            // Unique constraints to enforce business rules at DB level
            modelBuilder.Entity<FamilyGroup>()
                .HasIndex(g => g.InviteCode)
                .IsUnique();

            modelBuilder.Entity<GroupMembershipRequest>()
                .HasIndex(r => new { r.UserId, r.FamilyGroupId })
                .HasFilter("[Status] = 'Pending'")
                .IsUnique();

            modelBuilder.Entity<GroupMembershipRequest>()
                .Property(r => r.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Pending")
                .IsConcurrencyToken();

            modelBuilder.Entity<FamilyGroup>()
                .Property(g => g.GroupType)
                .HasDefaultValue("Other");

            modelBuilder.Entity<FamilyGroup>()
                .Property(g => g.IsInviteOnly)
                .HasDefaultValue(true);

            modelBuilder.Entity<FamilyGroup>()
                .Property(g => g.IsSearchable)
                .HasDefaultValue(false);

            // GroupMember.UserId is now required (not nullable)
            modelBuilder.Entity<GroupMember>()
                .HasOne(gm => gm.User)
                .WithMany()
                .HasForeignKey(gm => gm.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();
        }
    }
}
