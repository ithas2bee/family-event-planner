# Polls MVP Backend Implementation

## Overview

Implemented backend API functionality for Polls MVP following the established architectural patterns from Events and Announcements.

**Status:** ? Backend Complete (Frontend NOT implemented per requirements)

---

## Architecture Decisions

### ? Confirmed Requirements Met

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| **One vote per member per poll** | Database enforced via query in Vote endpoint | ? |
| **Group-scoped only** | FamilyEventId ignored in Create/Get operations | ? |
| **No schema redesign** | Used existing Poll/PollOption/PollVote tables | ? |
| **MemberId auth pattern** | `[Authorize(AuthenticationSchemes = "MemberId")]` | ? |
| **Minimum 2 options** | Validation in Create endpoint | ? |
| **No empty option text** | Validation in Create endpoint | ? |
| **Creator attribution** | CreatedByMemberId + CreatorDisplayName | ? |
| **Vote counts** | Calculated per option in responses | ? |
| **Current member vote** | CurrentMemberSelectedOptionId in response | ? |

---

## API Endpoints

### 1. Create Poll

**Endpoint:** `POST /api/polls`

**Authentication:** Requires `X-Member-Id` header (MemberId authentication)

**Request Body:**
```json
{
  "familyGroupId": "guid",
  "question": "What should we do for the reunion?",
  "options": [
    "Beach party",
    "Mountain hike",
    "City tour"
  ]
}
```

**Validation:**
- ? Minimum 2 options required
- ? Empty/whitespace option text rejected
- ? Group must exist
- ? Member must belong to group
- ? `FamilyEventId` ignored (group-scoped only)

**Response (201 Created):**
```json
{
  "id": "guid",
  "familyGroupId": "guid",
  "familyEventId": null,
  "question": "What should we do for the reunion?",
  "createdByMemberId": "guid",
  "creatorDisplayName": "John Smith",
  "createdAt": "2025-04-13T12:34:56.789Z",
  "currentMemberSelectedOptionId": null,
  "options": [
    {
      "id": "guid",
      "text": "Beach party",
      "voteCount": 0
    },
    {
      "id": "guid",
      "text": "Mountain hike",
      "voteCount": 0
    },
    {
      "id": "guid",
      "text": "City tour",
      "voteCount": 0
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request` - Less than 2 options or empty option text
- `403 Forbidden` - Not a member of the group
- `404 Not Found` - Group doesn't exist

**Debug Logging:**
```
[CREATE POLL] Poll {guid} created by member {guid} in group {guid}
```

---

### 2. Get Polls By Group

**Endpoint:** `GET /api/polls/group/{familyGroupId}`

**Authentication:** Requires `X-Member-Id` header (MemberId authentication)

**Query Parameters:**
- `pageNumber` (optional, default: 1)
- `pageSize` (optional, default: 20, max: 100)

**Response (200 OK):**
```json
[
  {
    "id": "guid",
    "familyGroupId": "guid",
    "familyEventId": null,
    "question": "What should we do for the reunion?",
    "createdByMemberId": "guid",
    "creatorDisplayName": "John Smith",
    "createdAt": "2025-04-13T12:34:56.789Z",
    "currentMemberSelectedOptionId": "guid",
    "options": [
      {
        "id": "guid",
        "text": "Beach party",
        "voteCount": 5
      },
      {
        "id": "guid",
        "text": "Mountain hike",
        "voteCount": 3
      },
      {
        "id": "guid",
        "text": "City tour",
        "voteCount": 2
      }
    ]
  }
]
```

**Features:**
- ? Returns all polls for the group
- ? Includes creator display name (via join)
- ? Includes vote counts per option
- ? Includes current member's selected option (if voted)
- ? Ordered by `CreatedAt` descending (newest first)
- ? Pagination support

**Error Responses:**
- `403 Forbidden` - Not a member of the group
- `404 Not Found` - Group doesn't exist

**Debug Logging:**
```
[GET POLLS] Fetching polls for group {guid}, requested by member {guid}
[GET POLLS] Returning {count} polls for group {guid}
```

---

### 3. Get Poll By ID

**Endpoint:** `GET /api/polls/{id}`

**Authentication:** Requires `X-Member-Id` header (MemberId authentication)

**Response (200 OK):** Same structure as single poll in Get Polls By Group

**Features:**
- ? Includes creator display name
- ? Includes vote counts per option
- ? Includes current member's selected option (if voted)

**Error Responses:**
- `403 Forbidden` - Not a member of the poll's group
- `404 Not Found` - Poll doesn't exist

---

### 4. Vote on Poll

**Endpoint:** `POST /api/polls/vote`

**Authentication:** Requires `X-Member-Id` header (MemberId authentication)

**Request Body:**
```json
{
  "pollOptionId": "guid"
}
```

**Validation:**
- ? Option must exist
- ? Member must belong to poll's group
- ? One vote per member per poll (prevents duplicate voting)

**Response (200 OK):**
```json
{
  "id": "guid",
  "pollOptionId": "guid",
  "memberId": "guid",
  "createdAt": "2025-04-13T12:34:56.789Z"
}
```

**Error Responses:**
- `400 Bad Request` - Member already voted in this poll
- `403 Forbidden` - Not a member of the group
- `404 Not Found` - Poll option doesn't exist

**Note:** Voting functionality exists but was NOT requested for MVP scope. Included for completeness.

---

## Data Models

### Database Tables (Existing - No Changes)

**Polls Table:**
```csharp
public class Poll
{
    public Guid Id { get; set; }
    public Guid? FamilyEventId { get; set; }  // Ignored in MVP
    public Guid FamilyGroupId { get; set; }
    public string Question { get; set; }
    public Guid? CreatedByMemberId { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<PollOption> Options { get; set; }
}
```

**PollOptions Table:**
```csharp
public class PollOption
{
    public Guid Id { get; set; }
    public Guid PollId { get; set; }
    public string Text { get; set; }
}
```

**PollVotes Table:**
```csharp
public class PollVote
{
    public Guid Id { get; set; }
    public Guid PollOptionId { get; set; }
    public Guid MemberId { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

### Response Model (Updated)

**PollResponse:**
```csharp
public class PollResponse
{
    public Guid Id { get; set; }
    public Guid FamilyGroupId { get; set; }
    public Guid? FamilyEventId { get; set; }
    public string Question { get; set; }
    public Guid? CreatedByMemberId { get; set; }
    public string? CreatorDisplayName { get; set; }  // NEW
    public DateTime CreatedAt { get; set; }  // NEW
    public Guid? CurrentMemberSelectedOptionId { get; set; }  // NEW
    public List<PollOptionResponse> Options { get; set; }
}
```

**PollOptionResponse (Unchanged):**
```csharp
public class PollOptionResponse
{
    public Guid Id { get; set; }
    public string Text { get; set; }
    public int VoteCount { get; set; }
}
```

---

## Authentication Pattern

### Backend Controller

```csharp
[ApiController]
[Route("api/[controller]")]
[Microsoft.AspNetCore.Authorization.Authorize(AuthenticationSchemes = "MemberId")]
public class PollsController : ControllerBase
```

**Pattern Matches:**
- ? `EventsController`
- ? `AnnouncementsController`
- ? `GroupMembersController`

### Required Headers

**All endpoints require:**
```
X-Member-Id: {member-guid}
Content-Type: application/json
```

### Authentication Flow

1. Frontend sends `X-Member-Id` header
2. `MemberAuthenticationHandler` validates header
3. Creates claims: `memberId`, `displayName`, `groupId`
4. Controller reads `User.FindFirst("memberId")` claim
5. Validates member belongs to requested group

---

## Code Changes Summary

### Files Modified

1. **Controllers/PollsController.cs**
   - Changed auth scheme to `MemberId`
   - Added validation: minimum 2 options, no empty text
   - Added creator display name via join
   - Added current member selected option
   - Added debug logging
   - Ordered polls by CreatedAt descending

2. **Models/Responses/PollResponse.cs**
   - Added `CreatedByMemberId`
   - Added `CreatorDisplayName`
   - Added `CreatedAt`
   - Added `CurrentMemberSelectedOptionId`

### Files NOT Modified (Per Requirements)

- ? Database schema (no migrations)
- ? Frontend services
- ? Frontend screens
- ? Request models (sufficient as-is)

---

## Pattern Consistency

### Comparison with Events/Announcements

| Feature | Events | Announcements | Polls |
|---------|--------|---------------|-------|
| **Auth Scheme** | MemberId | MemberId | MemberId ? |
| **Creator Display Name** | ? | ? | ? |
| **Debug Logging** | ? | ? | ? |
| **Member Validation** | ? | ? | ? |
| **Pagination** | ? | ? | ? |
| **Sort Order** | ASC (StartDate) | DESC (CreatedAt) | DESC (CreatedAt) ? |

---

## Testing Checklist

### Create Poll

- [ ] Create poll with 2 options ? Success
- [ ] Create poll with 3+ options ? Success
- [ ] Create poll with 1 option ? 400 Bad Request
- [ ] Create poll with empty option text ? 400 Bad Request
- [ ] Create poll with whitespace-only option ? 400 Bad Request
- [ ] Create poll without membership ? 403 Forbidden
- [ ] Create poll with invalid group ? 404 Not Found
- [ ] Verify CreatedByMemberId is set correctly
- [ ] Verify CreatedAt is set to current time
- [ ] Verify CreatorDisplayName is returned

### Get Polls By Group

- [ ] Get polls as group member ? Success (200 OK)
- [ ] Get polls as non-member ? 403 Forbidden
- [ ] Get polls with invalid group ? 404 Not Found
- [ ] Verify polls ordered newest first
- [ ] Verify creator display names correct
- [ ] Verify vote counts accurate
- [ ] Verify current member selected option (if voted)
- [ ] Verify current member selected option null (if not voted)
- [ ] Test pagination parameters

### Get Poll By ID

- [ ] Get poll as group member ? Success
- [ ] Get poll as non-member ? 403 Forbidden
- [ ] Get invalid poll ? 404 Not Found
- [ ] Verify all response fields populated correctly

### Vote on Poll

- [ ] Vote once ? Success
- [ ] Vote twice on same poll ? 400 Bad Request
- [ ] Vote as non-member ? 403 Forbidden
- [ ] Vote on invalid option ? 404 Not Found

---

## Debug Logging

**Create Poll:**
```
[CREATE POLL] Poll {pollId} created by member {memberId} in group {groupId}
```

**Get Polls:**
```
[GET POLLS] Fetching polls for group {groupId}, requested by member {memberId}
[GET POLLS] Returning {count} polls for group {groupId}
```

**Location:** Visual Studio Output Window ? Debug

---

## Frontend Integration (NOT IMPLEMENTED)

**Required for frontend (future work):**

1. Create `services/pollService.ts`
   - Must include `X-Member-Id` header (see `eventService.ts` pattern)
   - Implement `getPollsByGroup(groupId)`
   - Implement `createPoll(request)`
   - Implement `votePoll(pollOptionId)`

2. Create `app/polls.tsx` screen
   - Display polls list
   - Show vote counts
   - Highlight current member's selection
   - Navigate to create poll screen

3. Create `app/create-poll.tsx` screen
   - Question input
   - Dynamic option list (min 2, add/remove)
   - Validation matching backend

**Pattern Reference:** Copy structure from `eventService.ts` and `events.tsx`

---

## Known Limitations / Future Enhancements

### MVP Scope (Current)
- ? Group-scoped polls only
- ? One vote per member per poll
- ? Basic create/read operations

### Out of Scope (Future)
- ? Event-scoped polls (schema supports, logic ignores)
- ? Change vote functionality
- ? Delete poll (only creator/admin)
- ? Update poll question/options
- ? Poll expiration dates
- ? Anonymous voting
- ? Poll results visualization

---

## Security Considerations

### ? Implemented

1. **Authentication Required** - All endpoints use MemberId auth
2. **Authorization Checks** - Member must belong to group
3. **Vote Integrity** - One vote per member per poll enforced
4. **Input Validation** - Empty options rejected, minimum 2 options

### ?? Consider for Production

1. **Rate Limiting** - Prevent poll/vote spam
2. **Option Limits** - Max number of options per poll
3. **Question Length** - Already limited to 500 chars
4. **Audit Logging** - Track poll creation/voting for moderation

---

## Troubleshooting

### 401 Unauthorized

**Cause:** Missing `X-Member-Id` header

**Fix:** Ensure frontend service includes header (see `TROUBLESHOOTING_401_AUTH_MISMATCH.md`)

### 403 Forbidden

**Cause:** Member not part of group or invalid memberId

**Fix:** Verify user joined group via `/api/groupmembers/join`

### 400 Bad Request (Create Poll)

**Causes:**
- Less than 2 options
- Empty/whitespace option text
- Invalid request format

**Fix:** Validate input on frontend before sending

### Empty Vote Counts

**Cause:** No votes cast yet

**Expected:** Vote counts start at 0

---

## File Locations

```
FamilyEventPlanner.Api/
??? Controllers/
?   ??? PollsController.cs          (MODIFIED)
??? Models/
?   ??? Poll.cs                     (Existing)
?   ??? PollOption.cs               (Existing)
?   ??? PollVote.cs                 (Existing)
?   ??? CreatePollRequest.cs        (Existing)
?   ??? VoteRequest.cs              (Existing)
?   ??? Responses/
?       ??? PollResponse.cs         (MODIFIED)
?       ??? PollOptionResponse.cs   (Existing)
??? Auth/
    ??? MemberAuthenticationHandler.cs (Existing)
```

---

## Next Steps

### Immediate (Backend)
- [x] Implement Create Poll endpoint with validation
- [x] Implement Get Polls By Group with creator info
- [x] Add current member selected option
- [x] Add debug logging
- [x] Update response models
- [x] Build and verify no errors

### Frontend (Future Work)
- [ ] Create `pollService.ts` with header pattern
- [ ] Create polls list screen
- [ ] Create create-poll screen
- [ ] Add navigation from family-home
- [ ] Test end-to-end flow

### Testing
- [ ] Manual API testing with Postman/Swagger
- [ ] Verify debug logs appear
- [ ] Test all validation scenarios
- [ ] Test pagination
- [ ] Test vote counting accuracy

---

## Summary

**Backend Polls MVP Complete** ?

- ? Two core endpoints implemented (Create, Get By Group)
- ? Follows established auth patterns (MemberId)
- ? Includes creator attribution and vote counts
- ? Shows current member's selection
- ? Validates minimum options and empty text
- ? Debug logging added
- ? No schema changes required
- ? Consistent with Events/Announcements architecture

**Frontend NOT implemented** (per requirements)

Ready for frontend integration following the same pattern as Events and Announcements.

---

*Implementation Date: 2025-04-13*  
*Pattern: Matches Events and Announcements architecture*  
*Authentication: MemberId scheme (X-Member-Id header)*
