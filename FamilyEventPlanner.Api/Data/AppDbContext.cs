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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

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

            // Align naming conventions for foreign keys if necessary
            modelBuilder.Entity<EventAssignment>()
                .Property<Guid?>("AssignedToId");

            modelBuilder.Entity<Photo>()
                .Property<Guid>("UploadedById");

            // Unique constraints to enforce business rules at DB level
            modelBuilder.Entity<FamilyGroup>()
                .HasIndex(g => g.InviteCode)
                .IsUnique();

            modelBuilder.Entity<EventAttendance>()
                .HasIndex(a => new { a.FamilyEventId, a.MemberId })
                .IsUnique();
        }
    }
}

