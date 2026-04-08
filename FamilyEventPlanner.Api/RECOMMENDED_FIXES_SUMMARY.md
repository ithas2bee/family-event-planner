# Recommended Fixes - Summary

This document summarizes the code review and recommended fixes applied to the Family Event Planner API.

## Fixes Applied

### 1. Database Unique Constraints (Migration: `AddUniqueConstraints`)

**Problem:** Race conditions and duplicate data risks.

**Solution:** Added two unique constraints via EF Core:
- `FamilyGroups.InviteCode` — unique index ensures no two groups have the same invite code.
- `EventAttendances(FamilyEventId, MemberId)` — composite unique index prevents duplicate RSVPs for the same member on the same event.

**Migration File:** `Migrations/20260408_AddUniqueConstraints.cs`

**Impact:**
- DB enforces uniqueness at the constraint level.
- Prevents race condition when generating invite codes.
- Prevents duplicate RSVP creation if POST endpoint is called twice.

---

### 2. Request DTOs Instead of EF Entities

**Problem:** Accepting `FamilyGroup` EF entity in POST request allows clients to inject extra fields (e.g., `CreatedAt`, `Id`) that should be server-only.

**Solution:** Created dedicated request DTO `CreateFamilyGroupRequest` with only safe fields.

**Files Changed:**
- Added: `Models/CreateFamilyGroupRequest.cs`
- Updated: `Controllers/FamilyGroupsController.cs` — now accepts DTO instead of entity.

**Impact:**
- Clearer API surface; DTOs define allowed input.
- Prevents field injection attacks.
- Better separation of concerns.

---

### 3. Removed Public GetGroups Endpoint

**Problem:** `GET /api/familygroups` returned all groups without authentication — data leak.

**Solution:** Removed public listing endpoint. If needed, can add later with `[Authorize]` + membership check.

**Files Changed:**
- `Controllers/FamilyGroupsController.cs` — removed `GetGroups()` method.

**Impact:**
- Prevents unauthenticated users from enumerating all groups.
- Groups are accessed via `/api/familygroups/{id}` (by id) or via member join/list members endpoints.

---

### 4. EventAttendance RSVP Deduplication

**Problem:** Calling POST `/api/eventattendance` twice for the same member creates duplicate records.

**Solution:** Implemented upsert logic — if attendance record exists for (event, member), update it; otherwise create new.

**Files Changed:**
- `Controllers/EventAttendanceController.cs` — Create method now checks for existing record before creating.

**Behavior:**
- First RSVP: creates record, returns `201 Created`.
- Duplicate RSVP: updates existing record, returns `200 OK`.
- DB unique constraint prevents duplicates even if app logic is bypassed.

---

### 5. Enhanced Model Validation

**Problem:** Some endpoints didn't validate ModelState or check required fields consistently.

**Solution:**
- Added `[Authorize]` attribute to all endpoints that need authentication.
- Added ModelState validation in POST/PUT endpoints.
- Ensured required fields in DTOs (e.g., `[Required]` on Title, StartDate).

**Files Changed:**
- `Controllers/EventsController.cs`
- `Controllers/EventAttendanceController.cs`
- `Controllers/EventAssignmentsController.cs`
- `Controllers/AnnouncementsController.cs`
- `Controllers/PollsController.cs`
- `Controllers/NotificationsController.cs`
- `Controllers/GroupMembersController.cs`

**Impact:**
- Consistent 400 Bad Request for invalid data.
- Requires authentication header `X-Member-Id` where needed.

---

### 6. Group Membership Protection on GetMembers

**Problem:** `GET /api/groupmembers/{groupId}` returned all members without checking if caller is in the group.

**Solution:** Added `[Authorize]` and membership check — caller must be a member of the requested group.

**Files Changed:**
- `Controllers/GroupMembersController.cs` — GetMembers now requires auth and membership.

**Impact:**
- Returns `403 Forbid` if caller not a member of the group.
- Prevents cross-group member list enumeration.

---

## Remaining Recommendations (Not Yet Implemented)

### A. Response DTOs for All Endpoints

Some endpoints still return full EF entities (e.g., `FamilyGroup` in CreateGroup response).

**Recommendation:** Create response DTOs for all entity types if you want to:
- Hide internal fields from clients.
- Control exact JSON shape returned.
- Example: `FamilyGroupResponse`, `GroupMemberResponse`, etc.

**Effort:** Medium (create ~8 response DTOs, map in controllers).

---

### B. Authentication Upgrade

Current auth uses header-based scheme (`X-Member-Id`), suitable for development/testing.

**Recommendation for Production:**
- Integrate with JWT (JSON Web Tokens) or OIDC (OpenID Connect).
- Issue tokens on login; validate in middleware.
- Replace header scheme with bearer token validation.

**Example Libraries:** IdentityServer4, Auth0, Azure AD.

---

### C. Permission Refinement

Current logic:
- Only creator or admin can delete events/announcements.
- Only event attendee or admin can update RSVP.

**Recommendation:** Consider finer-grained permissions if needed:
- Who can edit other members' RSVPs?
- Can non-admin members create events?
- Can non-creator members update announcements?

**Approach:** Add role-based or permission-based authorization policies.

---

### D. Comprehensive Integration Tests

A full test suite (xUnit + WebApplicationFactory + InMemory DB) should cover:
1. RSVP deduplication (create, then duplicate ? update, not duplicate).
2. Cross-group access prevention (member of group A cannot read group B events).
3. Unique constraints (invite code collision, duplicate RSVP).
4. Permission checks (only creator/admin can delete).
5. Required field validation (title, body, startDate, etc.).
6. Foreign key validation (event must exist, group must exist).

**See:** `TESTING_GUIDE.md` for detailed test cases and setup instructions.

---

### E. Database Backup & Migration Validation

After deploying `AddUniqueConstraints` migration to production:

**Steps:**
1. Backup production database.
2. Run migration: `dotnet ef database update`.
3. If existing duplicate RSVPs exist, migration will fail; clean up duplicates first:
   ```sql
   DELETE FROM EventAttendances
   WHERE Id NOT IN (
       SELECT MIN(Id) FROM EventAttendances GROUP BY FamilyEventId, MemberId
   );
   ```
4. Re-run migration.

---

## Summary of Changes

| Item | Status | Files |
|------|--------|-------|
| Unique constraints (InviteCode, EventAttendance composite) | ? Done | `Migrations/20260408_AddUniqueConstraints.cs`, `Data/AppDbContext.cs` |
| Request DTO for FamilyGroup create | ? Done | `Models/CreateFamilyGroupRequest.cs`, `Controllers/FamilyGroupsController.cs` |
| Remove public GetGroups | ? Done | `Controllers/FamilyGroupsController.cs` |
| RSVP deduplication (upsert logic) | ? Done | `Controllers/EventAttendanceController.cs` |
| Model validation & auth | ? Done | All controllers |
| GetMembers membership check | ? Done | `Controllers/GroupMembersController.cs` |
| Response DTOs | ? Recommended | N/A |
| JWT authentication | ? Recommended | N/A |
| Integration tests guide | ? Done | `TESTING_GUIDE.md` |

---

## Testing Checklist

Before committing to production:

- [ ] Run: `dotnet ef database update` (apply `AddUniqueConstraints` migration).
- [ ] Run: `dotnet build` (verify no compilation errors).
- [ ] Test in Swagger:
  - Join group twice with same email ? expect 400 Bad Request.
  - Create RSVP twice for same event ? expect 201, then 200 (update).
  - Try to access event as non-member ? expect 403 Forbid.
  - Try to create group with empty name ? expect 400 Bad Request.
- [ ] (Optional) Set up integration tests (see `TESTING_GUIDE.md`).
- [ ] Review migration for any existing duplicate data that could cause FK violations.

---

## Next Steps

1. **Test Locally:** Run the app with the new migration, test in Swagger per checklist above.
2. **Deploy Migration:** When ready for production, run `dotnet ef database update` on live DB (after backup).
3. **Add More Tests:** Follow `TESTING_GUIDE.md` to add xUnit integration tests.
4. **Plan Future Work:** Consider response DTOs and JWT auth for next sprint.

---

## Questions?

Refer to:
- `TESTING_GUIDE.md` — for test setup and examples.
- `Data/AppDbContext.cs` — for EF model configuration and unique constraints.
- Individual controller files — for endpoint logic.
