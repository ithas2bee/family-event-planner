# Troubleshooting Guide: 401 Authentication Mismatch Between Frontend and Backend

## Problem Overview

**Symptom:** Specific API endpoints return `401 Unauthorized` for all users on both web and mobile, while other endpoints work correctly.

**Example Case:** Events endpoint failing with 401, while Members and Announcements work normally.

---

## Root Cause

**Frontend-Backend Header Mismatch:** The frontend service was not sending the required authentication header that the backend controller expects.

### Why This Happens

The application uses **two authentication schemes**:
1. **JWT Bearer** (`Authorization: Bearer {token}`) - Default scheme
2. **MemberId** (`X-Member-Id: {guid}`) - Custom scheme for member-based operations

Controllers must **explicitly specify** which scheme they use. If a controller expects one scheme but the frontend sends a different header, authentication fails with 401.

---

## Diagnostic Process

### Step 1: Compare Backend Controllers

**Check class-level authorization attributes:**

? **Working Controller (e.g., AnnouncementsController.cs):**
```csharp
[ApiController]
[Route("api/[controller]")]
[Microsoft.AspNetCore.Authorization.Authorize(AuthenticationSchemes = "MemberId")]
public class AnnouncementsController : ControllerBase
```

? **Broken Controller (e.g., EventsController.cs - BEFORE FIX):**
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize(AuthenticationSchemes = "MemberId")]  // ? Might have namespace issues
public class EventsController : ControllerBase
```

?? **Alternative Issue - Wrong Scheme:**
```csharp
[Authorize]  // ? Defaults to JWT Bearer, not MemberId
```

**Action:** Ensure ALL controllers use the **fully qualified namespace**:
```csharp
[Microsoft.AspNetCore.Authorization.Authorize(AuthenticationSchemes = "MemberId")]
```

---

### Step 2: Verify Authentication Handler

**Check `Auth/MemberAuthenticationHandler.cs`:**

```csharp
protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
{
    // Expect header X-Member-Id with GUID value
    if (!Request.Headers.TryGetValue("X-Member-Id", out var memberIdValues))
    {
        System.Diagnostics.Debug.WriteLine("[AUTH HANDLER] X-Member-Id header not found in request");
        return AuthenticateResult.NoResult();  // ? This causes 401
    }

    // ... rest of authentication logic
}
```

**Key Points:**
- Handler expects **exact header name**: `X-Member-Id`
- Missing header returns `AuthenticateResult.NoResult()` ? ASP.NET returns 401
- **Controller code never executes** if header is missing

---

### Step 3: Check Frontend Service Headers

**Compare working vs. broken services:**

#### ? Working Service (e.g., announcementService.ts)

```typescript
async function getAnnouncementHeaders(): Promise<Record<string, string>> {
  const headers = await getAuthHeaders();
  const session = await loadSession();

  if (session?.memberId) {
    headers['X-Member-Id'] = session.memberId;  // ? ADDS X-Member-Id
  }

  return headers;
}

export async function getAnnouncementsByGroup(groupId: string): Promise<Announcement[]> {
  const headers = await getAnnouncementHeaders();  // ? Uses custom header function

  const response = await fetch(`${API_BASE_URL}/api/announcements/group/${groupId}`, {
    method: 'GET',
    headers,  // ? Includes X-Member-Id
  });
  // ...
}
```

#### ? Broken Service (e.g., eventService.ts - BEFORE FIX)

```typescript
export async function getEventsByGroup(groupId: string): Promise<Event[]> {
  const headers = await getAuthHeaders();  // ? Only gets base headers (no X-Member-Id)

  const response = await fetch(`${API_BASE_URL}/api/events/group/${groupId}`, {
    method: 'GET',
    headers,  // ? Missing X-Member-Id header
  });
  // ...
}
```

**The Problem:** `getAuthHeaders()` only returns:
```typescript
// From authHeaderService.ts
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (session?.authToken) {
    headers['Authorization'] = `Bearer ${session.authToken}`;  // ? JWT only
  }

  return headers;  // ? NO X-Member-Id
}
```

---

## Step-by-Step Fix

### Fix 1: Backend - Ensure Correct Authorization Attribute

**Problem:** Namespace conflicts or wrong authentication scheme

**Solution:**

```csharp
// ? REMOVE this using statement (causes conflicts)
// using Microsoft.AspNetCore.Authorization;

namespace FamilyEventPlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Microsoft.AspNetCore.Authorization.Authorize(AuthenticationSchemes = "MemberId")]  // ? Fully qualified
    public class EventsController : ControllerBase
    {
        // ...
    }
}
```

**Key Rules:**
1. **Never use** `using Microsoft.AspNetCore.Authorization;` with `[Authorize]`
2. **Always use** fully qualified: `[Microsoft.AspNetCore.Authorization.Authorize(...)]`
3. **Always specify** `AuthenticationSchemes = "MemberId"` explicitly

---

### Fix 2: Frontend - Add Missing X-Member-Id Header

**Problem:** Service not sending required header

**Solution:** Add custom header function matching working services

**File:** `services/eventService.ts`

```typescript
// Add import
import { loadSession } from '@/services/sessionService';

// Add custom header function (after types, before other functions)
async function getEventHeaders(): Promise<Record<string, string>> {
  const headers = await getAuthHeaders();
  const session = await loadSession();

  if (session?.memberId) {
    headers['X-Member-Id'] = session.memberId;  // ? Add X-Member-Id
  }

  return headers;
}

// Update all fetch calls to use getEventHeaders()
export async function getEventsByGroup(groupId: string): Promise<Event[]> {
  const headers = await getEventHeaders();  // ? Changed from getAuthHeaders()

  const response = await fetch(`${API_BASE_URL}/api/events/group/${groupId}`, {
    method: 'GET',
    headers,
  });
  // ...
}

export async function createEvent(request: CreateEventRequest): Promise<Event> {
  const headers = await getEventHeaders();  // ? Changed from getAuthHeaders()

  const response = await fetch(`${API_BASE_URL}/api/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  // ...
}
```

---

## Verification Checklist

After applying fixes, verify:

### Backend

- [ ] Controller uses fully qualified `[Microsoft.AspNetCore.Authorization.Authorize(AuthenticationSchemes = "MemberId")]`
- [ ] No `using Microsoft.AspNetCore.Authorization;` statement in controller file
- [ ] Backend debug logs show: `[AUTH HANDLER] Successfully parsed GUID: {memberId}`

### Frontend

- [ ] Service has custom header function (e.g., `getEventHeaders()`)
- [ ] Custom function loads `session.memberId`
- [ ] Custom function adds `headers['X-Member-Id'] = session.memberId`
- [ ] All API calls use custom header function (not `getAuthHeaders()`)

### Testing

1. **Open browser DevTools ? Network tab**
2. **Trigger the API call** (e.g., navigate to Events screen)
3. **Check request headers:**
   ```
   X-Member-Id: {guid-value}  ? Must be present
   Authorization: Bearer {token}  ? May also be present
   ```
4. **Verify response:** Should be `200 OK`, not `401 Unauthorized`

---

## Common Pitfalls

### Pitfall 1: Namespace Conflict

**Symptom:** Controller has correct attribute but still returns 401

**Cause:**
```csharp
using Microsoft.AspNetCore.Authorization;  // ? This line

[Authorize(AuthenticationSchemes = "MemberId")]  // ? Might not resolve correctly
```

**Fix:** Remove `using` statement, use fully qualified attribute

---

### Pitfall 2: Forgetting to Update All Endpoints

**Symptom:** Some operations work (e.g., GET) but others fail (e.g., POST)

**Cause:** Only updated one function in the service

**Fix:** Search for **all** `getAuthHeaders()` calls in the service file and replace with custom header function:

```typescript
// ? BEFORE
const headers = await getAuthHeaders();

// ? AFTER
const headers = await getEventHeaders();
```

---

### Pitfall 3: Session State Not Available

**Symptom:** `X-Member-Id` header is `undefined`

**Cause:** User not logged in or session expired

**Fix:**
1. Check `sessionService.ts` - ensure `memberId` is saved to session
2. Verify user flow: Login ? Join Group ? Session contains `memberId`
3. Add defensive check:
   ```typescript
   if (!session?.memberId) {
     throw new Error('Not authenticated. Please log in again.');
   }
   ```

---

### Pitfall 4: Wrong Header Name

**Symptom:** Backend logs show "X-Member-Id header not found"

**Common Mistakes:**
```typescript
headers['MemberId'] = session.memberId;      // ? Wrong - no X- prefix
headers['X-MemberId'] = session.memberId;    // ? Wrong - missing dash
headers['x-member-id'] = session.memberId;   // ? Wrong - case mismatch (might work but inconsistent)
headers['X-Member-Id'] = session.memberId;   // ? Correct
```

**Fix:** Use exact header name: `X-Member-Id` (case-sensitive)

---

## Pattern Template

### For New Controllers

**Backend (C#):**
```csharp
using FamilyEventPlanner.Api.Data;
using FamilyEventPlanner.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
// ? DO NOT ADD: using Microsoft.AspNetCore.Authorization;

namespace FamilyEventPlanner.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Microsoft.AspNetCore.Authorization.Authorize(AuthenticationSchemes = "MemberId")]
    public class MyNewController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MyNewController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("{groupId}")]
        public async Task<IActionResult> GetItems(Guid groupId)
        {
            // Get authenticated member id from claims
            var memberIdClaim = User.FindFirst("memberId")?.Value;
            if (memberIdClaim == null || !Guid.TryParse(memberIdClaim, out var memberId))
                return Forbid();

            // Validate member belongs to group
            var isMember = await _context.GroupMembers.AnyAsync(m => 
                m.Id == memberId && m.FamilyGroupId == groupId);

            if (!isMember)
                return Forbid();

            // Your logic here...
        }
    }
}
```

**Frontend (TypeScript):**
```typescript
import { getAuthHeaders } from '@/services/authHeaderService';
import { loadSession } from '@/services/sessionService';

// Add custom header function
async function getMyServiceHeaders(): Promise<Record<string, string>> {
  const headers = await getAuthHeaders();
  const session = await loadSession();

  if (session?.memberId) {
    headers['X-Member-Id'] = session.memberId;
  }

  return headers;
}

// Use custom header function in all API calls
export async function getItems(groupId: string): Promise<Item[]> {
  const headers = await getMyServiceHeaders();

  const response = await fetch(`${API_BASE_URL}/api/mynew/${groupId}`, {
    method: 'GET',
    headers,
  });

  // ...
}

export async function createItem(request: CreateItemRequest): Promise<Item> {
  const headers = await getMyServiceHeaders();

  const response = await fetch(`${API_BASE_URL}/api/mynew`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  // ...
}
```

---

## Debug Commands

### Backend Logs

Add temporary debug logging to controller:
```csharp
[HttpGet("{groupId}")]
public async Task<IActionResult> GetItems(Guid groupId)
{
    System.Diagnostics.Debug.WriteLine($"[MY CONTROLLER] Called with groupId: {groupId}");

    var memberIdClaim = User.FindFirst("memberId")?.Value;
    System.Diagnostics.Debug.WriteLine($"[MY CONTROLLER] memberId claim: {memberIdClaim ?? "NULL"}");

    // ... rest of method
}
```

**Check Output Window in Visual Studio:**
- If you see `[AUTH HANDLER] X-Member-Id header not found` ? Frontend not sending header
- If you see `[MY CONTROLLER] Called` ? Auth passed, issue is in controller logic
- If you don't see controller logs at all ? Auth failing before reaching controller

### Frontend Logs

Add logging to service:
```typescript
async function getMyServiceHeaders(): Promise<Record<string, string>> {
  const headers = await getAuthHeaders();
  const session = await loadSession();

  console.log('[MY SERVICE] Session:', session);
  console.log('[MY SERVICE] MemberId:', session?.memberId);

  if (session?.memberId) {
    headers['X-Member-Id'] = session.memberId;
  }

  console.log('[MY SERVICE] Final headers:', headers);
  return headers;
}
```

**Check browser console:**
- Verify `memberId` is in session
- Verify `X-Member-Id` is in final headers object
- Use Network tab to confirm header is actually sent in HTTP request

---

## Quick Reference

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Backend namespace conflict** | 401 despite correct attribute | Remove `using Microsoft.AspNetCore.Authorization;`, use fully qualified attribute |
| **Missing X-Member-Id header** | Backend logs "header not found" | Add custom header function in frontend service |
| **Wrong auth scheme** | Works locally, fails deployed | Verify `AuthenticationSchemes = "MemberId"` is specified |
| **Session missing memberId** | `X-Member-Id` is undefined | Check user login/join flow populates session |
| **Case-sensitive header** | 401 on some platforms | Use exact: `X-Member-Id` |

---

## Related Files Reference

### Backend
- `Auth/MemberAuthenticationHandler.cs` - Validates X-Member-Id header
- `Program.cs` (line 77) - Registers MemberId auth scheme
- `Controllers/*Controller.cs` - Must use `[Authorize(AuthenticationSchemes = "MemberId")]`

### Frontend
- `services/authHeaderService.ts` - Base headers (JWT only)
- `services/sessionService.ts` - Stores memberId
- `services/*Service.ts` - Each needs custom header function adding X-Member-Id

---

## Prevention

### Code Review Checklist

When adding new API endpoints:

**Backend:**
- [ ] Controller uses `[Microsoft.AspNetCore.Authorization.Authorize(AuthenticationSchemes = "MemberId")]`
- [ ] No `using Microsoft.AspNetCore.Authorization;` statement
- [ ] Controller reads `User.FindFirst("memberId")` claim
- [ ] Controller validates member belongs to group

**Frontend:**
- [ ] Service has custom header function (e.g., `getXxxHeaders()`)
- [ ] Custom function adds `headers['X-Member-Id'] = session.memberId`
- [ ] All API calls use custom header function
- [ ] Import `loadSession` from sessionService

---

## Summary

**The Fix in One Sentence:**
Ensure the backend controller's `AuthenticationSchemes` matches the headers the frontend service sends.

**For MemberId Auth:**
- **Backend:** `[Authorize(AuthenticationSchemes = "MemberId")]`
- **Frontend:** `headers['X-Member-Id'] = session.memberId`

**Both must be present for authentication to succeed.**

---

*Last Updated: After resolving Events 401 issue*
*Pattern Established: Match Announcements and Members working implementation*
