# Swagger Testing Examples

This guide provides concrete examples for testing each endpoint in Swagger UI, including successful requests, invalid requests, and missing record scenarios.

## Authenticate in Swagger

All protected endpoints require the `X-Member-Id` header.

**Steps:**
1. Launch the API: `dotnet run`
2. Open Swagger UI: `http://localhost:5000/swagger`
3. Click **Authorize** button (top right)
4. In the "X-Member-Id" field, enter a valid `GroupMember` GUID (e.g., `123e4567-e89b-12d3-a456-426614174000`)
5. Click **Authorize**, then **Close**

All subsequent requests will include the header.

---

## FamilyGroupsController

### POST /api/familygroups — Create Group

#### Success (201 Created)
```json
{
  "name": "Smith Family Reunion"
}
```

**Expected Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Smith Family Reunion",
  "inviteCode": "ABC123",
  "createdAt": "2026-04-08T12:34:56.789Z"
}
```
Status: `201 Created`

---

#### Invalid (400 Bad Request) — Empty Name
```json
{
  "name": ""
}
```

**Expected Response:**
```json
{
  "errors": {
    "Name": ["The Name field is required."]
  }
}
```
Status: `400 Bad Request`

---

#### Invalid (400 Bad Request) — Null Name
```json
{
  "name": null
}
```

**Expected Response:**
```json
{
  "errors": {
    "Name": ["The Name field is required."]
  }
}
```
Status: `400 Bad Request`

---

### GET /api/familygroups/{id} — Get Group by ID

#### Success (200 OK)
**URL:** `/api/familygroups/550e8400-e29b-41d4-a716-446655440000`

**Expected Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Smith Family Reunion",
  "inviteCode": "ABC123",
  "createdAt": "2026-04-08T12:34:56.789Z"
}
```
Status: `200 OK`

---

#### Not Found (404 Not Found)
**URL:** `/api/familygroups/00000000-0000-0000-0000-000000000000` (non-existent GUID)

**Expected Response:**
```
(empty body)
```
Status: `404 Not Found`

---

## GroupMembersController

### POST /api/groupmembers/join — Join Group

#### Success (201 Created)
```json
{
  "inviteCode": "ABC123",
  "name": "Alice Smith",
  "email": "alice@smith.com"
}
```

**Expected Response:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "familyGroupId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Alice Smith",
  "email": "alice@smith.com",
  "isAdmin": false,
  "joinedAt": "2026-04-08T12:35:00.000Z"
}
```
Status: `201 Created`

---

#### Invalid (400 Bad Request) — Missing Email
```json
{
  "inviteCode": "ABC123",
  "name": "Bob Smith",
  "email": ""
}
```

**Expected Response:**
```json
{
  "errors": {
    "Email": [
      "The Email field is required.",
      "The Email field is not a valid e-mail address."
    ]
  }
}
```
Status: `400 Bad Request`

---

#### Invalid (400 Bad Request) — Invalid Email Format
```json
{
  "inviteCode": "ABC123",
  "name": "Bob Smith",
  "email": "not-an-email"
}
```

**Expected Response:**
```json
{
  "errors": {
    "Email": ["The Email field is not a valid e-mail address."]
  }
}
```
Status: `400 Bad Request`

---

#### Not Found (404 Not Found) — Invalid Invite Code
```json
{
  "inviteCode": "INVALID",
  "name": "Charlie Smith",
  "email": "charlie@smith.com"
}
```

**Expected Response:**
```json
"Invalid invite code."
```
Status: `404 Not Found`

---

#### Conflict (400 Bad Request) — Duplicate Email in Same Group
Assume "alice@smith.com" already joined group with code "ABC123".

```json
{
  "inviteCode": "ABC123",
  "name": "Alice Smith2",
  "email": "alice@smith.com"
}
```

**Expected Response:**
```json
"You are already in this group."
```
Status: `400 Bad Request`

---

#### Success (201 Created) — Same Email, Different Group
Assume "alice@smith.com" is in group A (ABC123), joining group B (DEF456):

```json
{
  "inviteCode": "DEF456",
  "name": "Alice in Group B",
  "email": "alice@smith.com"
}
```

**Expected Response:** (same member structure, different groupId)
Status: `201 Created`

This is allowed because members can belong to multiple groups.

---

### GET /api/groupmembers/{groupId} — List Members in Group

**Prerequisites:** Authenticate with X-Member-Id of a member in the group.

#### Success (200 OK)
**URL:** `/api/groupmembers/550e8400-e29b-41d4-a716-446655440000`

**Expected Response:**
```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "familyGroupId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Alice Smith",
    "email": "alice@smith.com",
    "isAdmin": true,
    "joinedAt": "2026-04-08T12:35:00.000Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440002",
    "familyGroupId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Bob Smith",
    "email": "bob@smith.com",
    "isAdmin": false,
    "joinedAt": "2026-04-08T12:36:00.000Z"
  }
]
```
Status: `200 OK`

---

#### Forbidden (403 Forbid) — Not a Member of Group
Authenticate with a member NOT in the requested group.

**URL:** `/api/groupmembers/550e8400-e29b-41d4-a716-446655440000`

**Expected Response:**
```
(empty body)
```
Status: `403 Forbid`

---

#### Not Found (404 Not Found) — Group Doesn't Exist
**URL:** `/api/groupmembers/00000000-0000-0000-0000-000000000000`

**Expected Response:**
```
(empty body)
```
Status: `404 Not Found`

---

## EventsController

### POST /api/events — Create Event

**Prerequisites:** Authenticate with X-Member-Id of a member in the target family group.

#### Success (201 Created)
```json
{
  "familyGroupId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Summer Reunion Picnic",
  "description": "Family picnic in the park",
  "startDate": "2026-07-10T12:00:00Z",
  "endDate": "2026-07-10T17:00:00Z",
  "location": "Central Park",
  "dressCode": "Casual",
  "notes": "Bring lawn chairs"
}
```

**Expected Response:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440010",
  "familyGroupId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Summer Reunion Picnic",
  "description": "Family picnic in the park",
  "startDate": "2026-07-10T12:00:00Z",
  "endDate": "2026-07-10T17:00:00Z",
  "location": "Central Park",
  "dressCode": "Casual",
  "notes": "Bring lawn chairs",
  "createdByMemberId": "660e8400-e29b-41d4-a716-446655440001",
  "createdAt": "2026-04-08T12:40:00Z"
}
```
Status: `201 Created` with `Location` header: `/api/events/770e8400-...`

---

#### Invalid (400 Bad Request) — Missing Title
```json
{
  "familyGroupId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "",
  "startDate": "2026-07-10T12:00:00Z"
}
```

**Expected Response:**
```json
{
  "errors": {
    "Title": ["The Title field is required."]
  }
}
```
Status: `400 Bad Request`

---

#### Invalid (400 Bad Request) — Missing StartDate
```json
{
  "familyGroupId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Summer Picnic"
}
```

**Expected Response:**
```json
{
  "errors": {
    "startDate": ["The startDate field is required."]
  }
}
```
Status: `400 Bad Request`

---

#### Not Found (404 Not Found) — Non-existent Group
```json
{
  "familyGroupId": "00000000-0000-0000-0000-000000000000",
  "title": "Picnic",
  "startDate": "2026-07-10T12:00:00Z"
}
```

**Expected Response:**
```json
{
  "message": "Family group not found."
}
```
Status: `404 Not Found`

---

#### Forbidden (403 Forbid) — Authenticated Member Not in Group
Authenticate with a member that does not belong to the target group.

```json
{
  "familyGroupId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Picnic",
  "startDate": "2026-07-10T12:00:00Z"
}
```

**Expected Response:**
```
(empty body)
```
Status: `403 Forbid`

---

### GET /api/events/group/{familyGroupId} — List Events for Group

#### Success (200 OK)
**URL:** `/api/events/group/550e8400-e29b-41d4-a716-446655440000`

**Expected Response:**
```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440010",
    "familyGroupId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Summer Reunion Picnic",
    "description": "Family picnic in the park",
    "startDate": "2026-07-10T12:00:00Z",
    "endDate": "2026-07-10T17:00:00Z",
    "location": "Central Park",
    "dressCode": "Casual",
    "notes": "Bring lawn chairs",
    "createdByMemberId": "660e8400-e29b-41d4-a716-446655440001",
    "createdAt": "2026-04-08T12:40:00Z"
  }
]
```
Status: `200 OK`

---

#### Forbidden (403 Forbid) — Not a Member
Authenticate with a member not in the group.

**URL:** `/api/events/group/550e8400-e29b-41d4-a716-446655440000`

**Expected Response:**
```
(empty body)
```
Status: `403 Forbid`

---

### GET /api/events/{id} — Get Single Event

#### Success (200 OK)
**URL:** `/api/events/770e8400-e29b-41d4-a716-446655440010`

**Expected Response:** (same as event object above)
Status: `200 OK`

---

#### Not Found (404 Not Found)
**URL:** `/api/events/00000000-0000-0000-0000-000000000000`

**Expected Response:**
```json
{
  "message": "Event not found."
}
```
Status: `404 Not Found`

---

## EventAttendanceController

### POST /api/eventattendance — RSVP to Event

**Prerequisites:** Authenticate with member in the event's family group.

#### Success — First RSVP (201 Created)
```json
{
  "familyEventId": "770e8400-e29b-41d4-a716-446655440010",
  "rsvp": 1,
  "guestCount": 2,
  "notes": "Bringing my spouse"
}
```

**Expected Response:**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440020",
  "familyEventId": "770e8400-e29b-41d4-a716-446655440010",
  "memberId": "660e8400-e29b-41d4-a716-446655440001",
  "rsvp": 1,
  "arrivalTime": null,
  "departureTime": null,
  "guestCount": 2,
  "notes": "Bringing my spouse"
}
```
Status: `201 Created`

---

#### Success — Duplicate RSVP (200 OK, Updates Record)
Call the same endpoint again (same member, same event):

```json
{
  "familyEventId": "770e8400-e29b-41d4-a716-446655440010",
  "rsvp": 2,
  "guestCount": 3,
  "notes": "Changed my mind, bringing more people"
}
```

**Expected Response:** (updated record)
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440020",
  "familyEventId": "770e8400-e29b-41d4-a716-446655440010",
  "memberId": "660e8400-e29b-41d4-a716-446655440001",
  "rsvp": 2,
  "guestCount": 3,
  "notes": "Changed my mind, bringing more people"
}
```
Status: `200 OK` (not 201, indicates update)

---

#### Invalid (400 Bad Request) — Missing FamilyEventId
```json
{
  "rsvp": 1,
  "guestCount": 1
}
```

**Expected Response:**
```json
{
  "errors": {
    "familyEventId": ["The familyEventId field is required."]
  }
}
```
Status: `400 Bad Request`

---

#### Not Found (404 Not Found) — Event Doesn't Exist
```json
{
  "familyEventId": "00000000-0000-0000-0000-000000000000",
  "rsvp": 1,
  "guestCount": 1
}
```

**Expected Response:**
```json
{
  "message": "Event not found."
}
```
Status: `404 Not Found`

---

#### Forbidden (403 Forbid) — Member Not in Event's Group
Authenticate with a member NOT in the event's family group.

```json
{
  "familyEventId": "770e8400-e29b-41d4-a716-446655440010",
  "rsvp": 1,
  "guestCount": 1
}
```

**Expected Response:**
```
(empty body)
```
Status: `403 Forbid`

---

### GET /api/eventattendance/event/{familyEventId} — List RSVPs for Event

#### Success (200 OK)
**URL:** `/api/eventattendance/event/770e8400-e29b-41d4-a716-446655440010`

**Expected Response:**
```json
[
  {
    "id": "880e8400-e29b-41d4-a716-446655440020",
    "familyEventId": "770e8400-e29b-41d4-a716-446655440010",
    "memberId": "660e8400-e29b-41d4-a716-446655440001",
    "rsvp": 1,
    "guestCount": 2
  },
  {
    "id": "880e8400-e29b-41d4-a716-446655440021",
    "familyEventId": "770e8400-e29b-41d4-a716-446655440010",
    "memberId": "660e8400-e29b-41d4-a716-446655440002",
    "rsvp": 2,
    "guestCount": 1
  }
]
```
Status: `200 OK`

---

## AnnouncementsController

### POST /api/announcements — Create Announcement

#### Success (201 Created)
```json
{
  "familyGroupId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Upcoming Family Reunion",
  "body": "The 2026 Smith family reunion is scheduled for July 10 at Central Park. See you there!"
}
```

**Expected Response:**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440030",
  "familyGroupId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Upcoming Family Reunion",
  "body": "The 2026 Smith family reunion is scheduled for July 10 at Central Park. See you there!",
  "createdByMemberId": "660e8400-e29b-41d4-a716-446655440001",
  "createdAt": "2026-04-08T13:00:00Z",
  "expiresAt": null
}
```
Status: `201 Created`

---

#### Invalid (400 Bad Request) — Missing Title
```json
{
  "familyGroupId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "",
  "body": "Some announcement"
}
```

**Expected Response:**
```json
{
  "errors": {
    "Title": ["The Title field is required."]
  }
}
```
Status: `400 Bad Request`

---

#### Invalid (400 Bad Request) — Missing Body
```json
{
  "familyGroupId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Announcement",
  "body": ""
}
```

**Expected Response:**
```json
{
  "errors": {
    "Body": ["The Body field is required."]
  }
}
```
Status: `400 Bad Request`

---

#### Not Found (404 Not Found) — Group Doesn't Exist
```json
{
  "familyGroupId": "00000000-0000-0000-0000-000000000000",
  "title": "Announcement",
  "body": "Body text"
}
```

**Expected Response:**
```json
{
  "message": "FamilyGroup not found."
}
```
Status: `404 Not Found`

---

## PollsController

### POST /api/polls — Create Poll

#### Success (201 Created)
```json
{
  "familyGroupId": "550e8400-e29b-41d4-a716-446655440000",
  "question": "What time should we start the picnic?",
  "options": ["10:00 AM", "12:00 PM", "2:00 PM"]
}
```

**Expected Response:**
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440040",
  "familyGroupId": "550e8400-e29b-41d4-a716-446655440000",
  "familyEventId": null,
  "question": "What time should we start the picnic?",
  "options": [
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440041",
      "text": "10:00 AM",
      "voteCount": 0
    },
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440042",
      "text": "12:00 PM",
      "voteCount": 0
    },
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440043",
      "text": "2:00 PM",
      "voteCount": 0
    }
  ]
}
```
Status: `201 Created`

---

#### Invalid (400 Bad Request) — Empty Options
```json
{
  "familyGroupId": "550e8400-e29b-41d4-a716-446655440000",
  "question": "What time?",
  "options": []
}
```

**Expected Response:**
```json
{
  "errors": {
    "Options": ["At least one option is required."]
  }
}
```
Status: `400 Bad Request`

---

### POST /api/polls/vote — Vote on Poll Option

#### Success (200 OK)
```json
{
  "pollOptionId": "bb0e8400-e29b-41d4-a716-446655440041"
}
```

**Expected Response:**
```json
{
  "id": "cc0e8400-e29b-41d4-a716-446655440050",
  "pollOptionId": "bb0e8400-e29b-41d4-a716-446655440041",
  "memberId": "660e8400-e29b-41d4-a716-446655440001",
  "createdAt": "2026-04-08T13:10:00Z"
}
```
Status: `200 OK`

---

#### Invalid (400 Bad Request) — Duplicate Vote
Call the same vote endpoint again (same member, same poll):

```json
{
  "pollOptionId": "bb0e8400-e29b-41d4-a716-446655440041"
}
```

**Expected Response:**
```json
{
  "message": "Member has already voted in this poll."
}
```
Status: `400 Bad Request`

---

#### Not Found (404 Not Found) — Option Doesn't Exist
```json
{
  "pollOptionId": "00000000-0000-0000-0000-000000000000"
}
```

**Expected Response:**
```json
{
  "message": "Poll option not found."
}
```
Status: `404 Not Found`

---

## NotificationsController

### POST /api/notifications — Create Notification

#### Success (201 Created)
```json
{
  "memberId": "660e8400-e29b-41d4-a716-446655440001",
  "message": "Alice has updated the event details",
  "type": "event_update",
  "link": "/events/770e8400-e29b-41d4-a716-446655440010"
}
```

**Expected Response:**
```json
{
  "id": "dd0e8400-e29b-41d4-a716-446655440060",
  "memberId": "660e8400-e29b-41d4-a716-446655440001",
  "message": "Alice has updated the event details",
  "isRead": false,
  "type": "event_update",
  "link": "/events/770e8400-e29b-41d4-a716-446655440010",
  "createdAt": "2026-04-08T13:15:00Z"
}
```
Status: `201 Created`

---

### GET /api/notifications — List Notifications for Authenticated Member

#### Success (200 OK)

**URL:** `/api/notifications`

**Expected Response:** (notifications for the authenticated member only)
```json
[
  {
    "id": "dd0e8400-e29b-41d4-a716-446655440060",
    "memberId": "660e8400-e29b-41d4-a716-446655440001",
    "message": "Alice has updated the event details",
    "isRead": false,
    "type": "event_update",
    "createdAt": "2026-04-08T13:15:00Z"
  }
]
```
Status: `200 OK`

---

### PUT /api/notifications/{id}/read — Mark Notification as Read

#### Success (204 No Content)
**URL:** `/api/notifications/dd0e8400-e29b-41d4-a716-446655440060/read`

```json
{}
```

**Expected Response:**
```
(empty body)
```
Status: `204 No Content`

Subsequent GET to `/api/notifications` will show `"isRead": true` for this notification.

---

#### Forbidden (403 Forbid) — Different Member
Authenticate as a different member, then try to mark read for another member's notification.

**URL:** `/api/notifications/dd0e8400-e29b-41d4-a716-446655440060/read`

**Expected Response:**
```
(empty body)
```
Status: `403 Forbid`

---

#### Not Found (404 Not Found)
**URL:** `/api/notifications/00000000-0000-0000-0000-000000000000/read`

**Expected Response:**
```json
{
  "message": "Notification not found."
}
```
Status: `404 Not Found`

---

## Testing Tips

1. **Use Postman or Insomnia** for more advanced testing (easy to set variables, save requests).
2. **Test in order**: Create group ? join member ? create event ? RSVP ? list ? update ? delete.
3. **Always test the "happy path" first**, then error cases.
4. **When testing 403/404**, verify you got the right status by checking the response status code in Swagger.
5. **For pagination**, add `?pageNumber=1&pageSize=10` to list endpoints (defaults apply if omitted).
