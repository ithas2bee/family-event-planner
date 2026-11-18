# Account deletion: data handling

The authenticated `DELETE /api/account` operation applies this policy. It
requires the current email/password account password and exact confirmation
value `DELETE`. The target comes only from the JWT subject; the request accepts
no account ID and does not accept `X-Member-Id` authentication. No Google or
Facebook authentication flow is implemented by this endpoint.

## Permanently deleted

These account-linked records are removed in the same relational transaction
that removes the account:

| Data | Handling and boundary |
| --- | --- |
| User account and identifying profile/authentication fields | Delete the user row, including email, password hash, display name, profile fields, profile-picture URL, and any legacy provider IDs on the row. |
| Password-reset tokens and membership requests | Delete all records belonging to the account. |
| Group memberships and member role assignments | Delete the user's memberships and role assignments. Preserve community role definitions and all other members. |
| Event attendance | Delete only this user's attendance and RSVP records. |
| Poll votes | Delete only votes cast by this user's memberships. Preserve polls, options, and other votes. |
| Kickback responses | Delete only responses belonging to this user's memberships. |
| Notifications | Delete only notifications addressed to this user's memberships. |

No separate audit record is retained for denied, invalid-password, last-admin,
or not-found requests.

## Anonymized or disassociated

These records remain in the database, but account/member attribution is removed:

| Data | Handling |
| --- | --- |
| Events created by the account | Preserve the event and its participants; clear the optional creator membership reference. |
| Polls, announcements, and kickbacks created by the account | Preserve the shared record and clear its optional creator reference. |
| Activity feed rows created by the account's memberships | Preserve the activity row, clear its actor reference, and clear that row's metadata. Other feed rows are also checked for a JSON `displayName` value exactly matching the user's current display name; matching metadata is cleared. |
| Event assignments | Preserve the task, clear its assignee, and change `Assigned` status to `Needed`. Never reassign it to another person or to Unknown Guest. |
| Shared photos | Preserve each photo record, file path, and caption; set the uploader reference to null. The uploader field is nullable after the account-deletion migration. |

The deletion audit table is not linked to the account or membership and does not
store a user ID, email, display name, IP address, JWT, password, request body, or
affected-record list. A successful deletion creates one row containing only a
random audit ID and the UTC completion timestamp. Rows expire after **30 days**
and are removed by the existing content-expiration processor, which runs every
15 minutes while the API is healthy. An outage of that processor can extend
actual removal until processing resumes. The audit is for aggregate evidence
that deletion completed; it cannot identify which account was deleted.

## Retained shared community content

Communities, their other members and roles, events, polls and options,
announcements, kickbacks, assignments, photos, and their shared files remain
available to the community. Existing application lifecycle rules continue to
apply; account deletion adds no new expiry to those records. A user who is the
last administrator cannot delete the account until another administrator has
been assigned. Communities and the reserved Unknown Guest system identity are
never deleted or repurposed by this workflow.

The repository does not establish a photo storage provider or `FilePath`
semantics. The API therefore does not delete photo files and does not claim
that external files have been removed. Backups, external profile-image hosting,
provider/operational logs, and other copies outside this API database are also
outside the deletion operation's verified boundary.

## Personal information in shared text and metadata

The API does **not** scan or redact personal information from free-text shared
content. Event titles/descriptions/locations/notes, assignment titles and
descriptions, poll questions/options, announcement titles/bodies, kickback
vibes/notes, and photo captions are retained as community content. Users should
not include private personal information in shared content they expect to
remain after account deletion.

Activity-feed sanitization is deliberately limited: it clears all metadata on
the departing member's own activity rows and clears metadata on other activity
rows only when a top-level JSON `displayName` value exactly matches the current
display name. It does not detect aliases, changed former display names,
identifiers embedded in other metadata values, malformed/non-JSON metadata, or
personal information embedded in the activity type, linked content, or free
text. Such information may remain attributable after account deletion.

## Processing and authentication

- Relational deletion, member-dependent cleanup, shared-record disassociation,
  account removal, and successful-deletion audit insertion are committed in one
  transaction. A failure before commit does not report success.
- JWT authentication checks that its subject still exists in `Users`; tokens
  for a deleted account fail on subsequent requests. Password-reset tokens
  are removed in the deletion transaction.
- Repeating deletion after a successful deletion returns not found at the
  service level; the deleted account's JWT is already invalid.
- Audit retention is configured by `AccountDeletionAudit:RetentionDays`
  (default `30`, minimum `1`).
