# Account deletion: data handling

The authenticated `DELETE /api/account` operation implements this policy. It
requires the current password and the exact confirmation value `DELETE`.
The target is taken only from the JWT subject; the request has no account ID.
The operation does not accept `X-Member-Id` authentication.

## Deletion and retention matrix

| Data | Handling | Retention boundary |
| --- | --- | --- |
| Account, credentials, email, display name, profile fields, social IDs, login timestamp | Delete the user row after removing its dependent data. The profile-picture URL is removed with the row. | No account data remains in the live application database. External copies of profile images, backups, logs, or provider records are not managed by this API. |
| Password-reset tokens and membership requests | Explicitly delete all records for the user. | None in the live database after commit. |
| Memberships and member role assignments | Explicitly delete memberships and role assignments. Preserve community role definitions. Never delete or repurpose the Unknown Guest user or membership. | Role definitions remain while their community exists. |
| Last-admin membership | Block deletion with a conflict response until another administrator has been assigned. No automatic transfer or community deletion. | No retention; request must be retried after the community has another administrator. |
| Communities and shared events | Preserve communities and events. Clear the event creator reference. | Shared content follows its existing community lifecycle; this API adds no separate account-deletion expiry. |
| Event attendance | Delete only attendance rows belonging to the departing member. Preserve other participants. | None in the live database after commit. |
| Event assignments | Preserve each assignment but clear the departing assignee. Change `Assigned` to `Needed`; preserve other statuses. Do not assign it to another person or to Unknown Guest. | Shared assignment remains under the event's existing community lifecycle until an authorized community action changes it. |
| Polls and options | Preserve shared polls and options; clear poll creator references. | Poll expiration and cleanup continue under existing application behavior. |
| Poll votes | Delete only votes belonging to the departing member. | None in the live database after commit. |
| Announcements | Preserve announcements and clear creator references. | Existing announcement expiration and cleanup apply. |
| Kickbacks | Preserve kickbacks and clear creator references. | Existing kickback lifecycle applies; this API adds no new expiry. |
| Kickback responses | Delete only responses belonging to the departing member. | None in the live database after commit. |
| Notifications | Delete notifications addressed to the departing member. | None in the live database after commit. |
| Activity feed | Preserve activity rows, clear actor references, and remove metadata from those rows. Remove metadata containing the departing user's display name in the `displayName` field. | Existing community activity lifecycle applies; no deletion audit record is created. |
| Shared photos and files | Preserve photo rows and `FilePath`; clear the uploader reference. The repository has no storage provider, upload/delete service, or verified `FilePath` semantics, so the API does not delete or claim to delete photo files. | Photos remain subject to the community's existing lifecycle. No separate photo expiry or storage-provider cleanup is implemented. |
| Unknown Guest system identity | Preserve unchanged; it is never eligible for account deletion or used as a replacement identity. | Platform lifetime. |

Shared event, poll, announcement, kickback, assignment, and photo content is
retained for community use, not as an account record. Existing lifecycle rules
are the only retention boundaries available in the repository; in particular,
the API does not define a fixed expiry for photos or events. Free-text content
is preserved and is not automatically scanned for personal details.

## Processing and authentication

- Database changes are performed in one relational transaction. There is no
  success response until the transaction commits. The operation explicitly
  removes member-dependent personal rows, clears optional creator/actor
  relationships, and removes memberships; it does not rely on user-level
  cascade deletion.
- A last administrator cannot delete their account until another community
  administrator exists. Assignment responsibility is left unassigned; it is
  never silently transferred.
- Shared photo files are preserved. No file deletion is attempted because the
  storage provider and path semantics cannot be verified from this repository.
- JWT authentication checks that its subject still exists in `Users`. Once
  deletion commits, existing stateless JWTs are rejected on subsequent API
  requests. Password-reset tokens are deleted in the same transaction.
- Repeating the service operation after successful deletion returns an
  account-not-found result; authentication rejects the deleted account's JWT.
- No deletion audit data is stored. External identity-provider records,
  profile-image hosting, provider logs, backups, and operational logs are
  outside this API's verified deletion boundary.
