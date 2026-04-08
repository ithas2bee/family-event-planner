# Integration Tests Guide

This document outlines the recommended integration tests to verify the security, validation, and deduplication logic implemented in the Family Event Planner API.

## Setup

To add integration tests, you need to:
1. Create a new test project:
   ```bash
   dotnet new xunit -n FamilyEventPlanner.Api.Tests
   ```
2. Add packages:
   ```bash
   cd FamilyEventPlanner.Api.Tests
   dotnet add package Microsoft.AspNetCore.Mvc.Testing
   dotnet add package xunit
   dotnet add package xunit.runner.visualstudio
   dotnet add reference ../FamilyEventPlanner.Api/FamilyEventPlanner.Api.csproj
   ```

## Test Classes and Cases

### 1. EventAttendanceTests
Tests RSVP deduplication and validation.

**Test Cases:**
- `CreateRsvp_NewMember_Returns201Created`: First-time RSVP creates new record, returns 201.
- `CreateRsvp_DuplicateMember_Returns200OK_Updates`: Duplicate RSVP updates existing record (no duplicate), returns 200.
- `CreateRsvp_NonexistentEvent_Returns404`: RSVP for missing event returns 404.
- `CreateRsvp_NonexistentMember_Returns403`: Member not in group returns 403 Forbid.
- `CreateRsvp_NoAuth_Returns403Forbid`: Missing X-Member-Id header returns 403.

**Validation:**
- Ensures unique composite index `(FamilyEventId, MemberId)` prevents duplicates at DB level.
- Verifies upsert logic: create-if-not-exists, update-if-exists.

---

### 2. FamilyGroupTests
Tests group creation and invite code uniqueness.

**Test Cases:**
- `CreateGroup_ValidRequest_Returns201WithInviteCode`: Valid group creation returns 201 with invite code.
- `CreateGroup_EmptyName_Returns400`: Empty/null name returns 400 Bad Request.
- `CreateGroup_InviteCodeUniqueness_DifferentForEachGroup`: Each group gets unique invite code.
- `CreateGroup_MissingRequest_Returns400`: Null request returns 400.

**Validation:**
- Verifies unique index on `InviteCode` prevents collisions at DB level.
- Confirms retry logic generates new code if collision detected.

---

### 3. GroupMemberJoinTests
Tests join logic, deduplication, and cross-group support.

**Test Cases:**
- `JoinGroup_ValidInviteCode_Returns201Created`: Valid invite code returns 201, member created in group.
- `JoinGroup_InvalidInviteCode_Returns404`: Invalid code returns 404.
- `JoinGroup_DuplicateEmail_Returns400`: Same email in same group returns 400.
- `JoinGroup_SameEmailDifferentGroup_Returns201Created`: Same email in different groups is allowed (returns 201).
- `JoinGroup_InvalidEmailFormat_Returns400`: Malformed email returns 400.
- `JoinGroup_MissingFields_Returns400`: Missing name/email returns 400.

**Validation:**
- Confirms duplicate check is per-group (email can be reused across groups).
- Verifies 201 Created response includes member object with correct FamilyGroupId.

---

### 4. CrossGroupAccessTests
Tests that users cannot access data from groups they don't belong to.

**Test Cases:**
- `GetEvents_UnauthorizedMember_Returns403`: Member not in group cannot list events, returns 403.
- `GetEvent_UnauthorizedMember_Returns403`: Member not in group cannot read event, returns 403.
- `UpdateEvent_UnauthorizedMember_Returns403`: Member not in group cannot update event, returns 403.
- `GetAttendance_UnauthorizedMember_Returns403`: Member not in group cannot list attendance, returns 403.
- `GetAnnouncements_UnauthorizedMember_Returns403`: Member not in group cannot list announcements, returns 403.
- `GetPoll_UnauthorizedMember_Returns403`: Member not in group cannot read poll, returns 403.

**Validation:**
- Verifies all list/read/update endpoints check group membership before returning data.
- Confirms 403 Forbid response when member not in group.

---

### 5. EventValidationTests
Tests required fields and FK validation.

**Test Cases:**
- `CreateEvent_MissingTitle_Returns400`: Event without title returns 400.
- `CreateEvent_MissingStartDate_Returns400`: Event without start date returns 400.
- `CreateEvent_NonexistentGroup_Returns404`: Event for missing group returns 404.
- `CreateEvent_NonMemberCreator_Returns403`: Non-member cannot create event in group, returns 403.
- `CreateEvent_ValidRequest_Returns201`: Valid event creation returns 201.

**Validation:**
- Confirms required field validation works.
- Verifies FK constraint: event must belong to existing group.

---

### 6. AnnouncementValidationTests
Tests announcement creation and permissions.

**Test Cases:**
- `CreateAnnouncement_MissingTitle_Returns400`: Missing title returns 400.
- `CreateAnnouncement_MissingBody_Returns400`: Missing body returns 400.
- `CreateAnnouncement_NonMember_Returns403`: Non-member cannot create, returns 403.
- `UpdateAnnouncement_NotCreatorOrAdmin_Returns403`: Non-creator/admin cannot update, returns 403.
- `DeleteAnnouncement_OnlyCreatorOrAdmin_CanDelete`: Only creator or admin can delete.

**Validation:**
- Confirms permission checks: creator/admin only.
- Verifies group membership is enforced.

---

### 7. PollVoteTests
Tests one-vote-per-member logic.

**Test Cases:**
- `Vote_FirstVote_Returns200OK`: First vote returns 200 OK.
- `Vote_SecondVote_SameMember_Returns400BadRequest`: Second vote by same member returns 400.
- `Vote_NonexistentOption_Returns404`: Vote for missing option returns 404.
- `Vote_NonMember_Returns403`: Non-member cannot vote, returns 403.

**Validation:**
- Confirms enforcement: one vote per member per poll.
- Verifies option must exist and belong to poll.

---

## Sample Test Structure

```csharp
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

public class EventAttendanceTests : IAsyncLifetime
{
    private WebApplicationFactory<Program> _factory;
    private HttpClient _client;
    private AppDbContext _dbContext;
    private Guid _testMemberId;

    public async Task InitializeAsync()
    {
        _factory = new WebApplicationFactory<Program>();
        _client = _factory.CreateClient();
        _dbContext = /* get from factory scope */;

        // Create test data: group, member, event
        _testMemberId = Guid.NewGuid();
        // ... setup
    }

    public async Task DisposeAsync()
    {
        _client?.Dispose();
        _factory?.Dispose();
    }

    [Fact]
    public async Task CreateRsvp_DuplicateMember_Updates()
    {
        // Arrange
        _client.DefaultRequestHeaders.Add("X-Member-Id", _testMemberId.ToString());
        var eventId = /* existing event */;

        // Act
        var response1 = await _client.PostAsJsonAsync("/api/eventattendance", 
            new { familyEventId = eventId, rsvp = 1 });
        var response2 = await _client.PostAsJsonAsync("/api/eventattendance", 
            new { familyEventId = eventId, rsvp = 2 });

        // Assert
        Assert.Equal(HttpStatusCode.Created, response1.StatusCode);
        Assert.Equal(HttpStatusCode.OK, response2.StatusCode); // Update, not create
        var records = await _dbContext.EventAttendances
            .Where(a => a.FamilyEventId == eventId).ToListAsync();
        Assert.Single(records); // No duplicate
    }
}
```

## Running Tests

```bash
cd FamilyEventPlanner.Api.Tests
dotnet test
```

## Expected Results

All tests should pass. If any fail:
1. Check controller logic for permission/validation bugs.
2. Verify DB constraints (unique indices) exist and are correctly configured.
3. Confirm DTOs enforce required field validation.

## Benefits

- **Security**: Cross-group access prevented; proper 403 responses.
- **Data Integrity**: Duplicates prevented at both app and DB level.
- **Validation**: Required fields, foreign keys, and format checks work.
- **Regression**: Future changes caught if they break these behaviors.
