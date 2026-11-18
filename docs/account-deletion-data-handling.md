# Account deletion: data handling proposal

**Status: discovery complete; product approval required before implementation.**

This document records the current API data model and a proposed account-deletion
policy for review. It does not implement deletion behavior. No database or
storage changes should be made until the decisions below are approved.

## Repository findings

- `AppDbContext` uses SQL Server and exposes users, memberships, groups, events,
  assignments, attendance, polls, announcements, photos, notifications,
  activity, kickbacks, membership requests, and password-reset tokens.
- A `User` may have several `GroupMember` rows. Each membership is tied to one
  `FamilyGroup`; `IsAdmin` and community-role assignments are membership
  properties. A group has no `CreatedBy`/owner field.
- Deleting a user cascades to `GroupMember` and `GroupMembershipRequest`, and
  deleting the user also cascades to `PasswordResetToken`. Many records linked
  to a `GroupMember` use `NO ACTION` foreign keys, including attendance,
  assignments, poll votes, notifications, activity, photos, and kickbacks.
  Deleting a user directly can therefore fail when a dependent record exists.
  The relationships do not encode a complete account-deletion policy.
- Events, polls, announcements, photos, activity, and kickbacks are associated
  with communities. Several creator/actor references are nullable and can
  represent disassociation; required member references (for example photo
  uploader, assignment assignee, poll voter, and notification recipient) need
  an explicit disposition before their membership can be removed.
- Event deletion currently removes assignments, attendance, related activity,
  and event-link notifications, but detaches event photos and polls so they
  remain as community-level content. Poll deletion removes options and votes;
  announcement and kickback deletion remove associated activity and
  notifications. These are content-deletion behaviors, not an account policy.
- The API stores photo `FilePath` values but has no photo upload/delete
  controller, storage abstraction, or configured file/blob provider. The
  repository does not establish whether these paths refer to a local,
  externally hosted, or otherwise managed file. Profile pictures are URL
  strings; event image presets are keys, not uploaded files.
- JWTs are stateless and default to a 24-hour lifetime. No refresh-token store,
  JWT revocation/denylist, or session table is present. The API also supports
  the `X-Member-Id` authentication scheme, which authenticates a group-member
  record rather than a user account.
- The reserved Unknown Guest user/member is used for non-member assignments.
  It is platform data and must not be treated as an ordinary account eligible
  for deletion. Do not repurpose it as an account-deletion pseudonym without
  product approval.
- No invitation entity or invitation-request table exists. `FamilyGroup`
  contains a group-level `InviteCode`; membership requests are represented by
  `GroupMembershipRequest`.

## Proposed deletion and retention matrix

The dispositions below are recommendations, not approved policy. “Delete” means
remove the account-linked database record; where a stored file may exist,
delete it only after identifying and verifying its actual storage provider.
No new fixed retention period is proposed because the repository contains no
account-deletion retention policy or audit store.

| Data / records | Proposed classification | Proposed handling and rationale |
| --- | --- | --- |
| `User` account, email, password hash, display name, age, location, bio, profile-picture URL, legacy roles, Google/Facebook IDs, login timestamp | Permanently deleted | Remove the account and directly identifying profile/authentication attributes. The profile picture is a URL, not a repository-managed upload; clear the URL and confirm whether its external host requires a separate removal request. |
| `PasswordResetToken` rows | Permanently deleted | Remove outstanding and historical reset-token records with the account. The model stores a token hash and expiry/used timestamps; the user FK currently cascades. |
| `GroupMembershipRequest` rows | Permanently deleted | Remove pending and processed requests for the user. These are tied directly to `User`; retaining them is not required by any repository behavior identified. |
| `GroupMember` rows, `CommunityRoleAssignment` rows, and the member’s community-role assignment | Permanently deleted | Remove each membership and its assignments after dependent records have been handled. Preserve the `CommunityRole` definitions because they belong to the community, not the member. |
| Community (`FamilyGroup`) records, group settings, invite code, group roles | Preserved as shared community content | Do not delete a group solely because one member leaves. Group ownership is not represented separately. Keep the group invite code and role definitions unless the group itself is separately deleted under an approved policy. |
| Admin status in each community | Preserved/transferred as shared governance | If another admin exists, retain the group and their existing permissions. If the deleting user is the last admin, require an approved successor/admin transfer or an explicit support process; do not silently delete the group or leave it without an admin. Existing APIs require at least one admin when demoting an admin. |
| Events created by the user | Preserved as shared community content; creator disassociated | Preserve community events and other participants’ information. Set the optional `CreatedByMemberId` to null so the event is not attributed to the deleted member. Do not delete an event just because its creator leaves. |
| Event attendance / RSVP by the deleting member | Permanently deleted | Remove only that member’s attendance row, RSVP, guest count, and notes. Preserve attendance for all other participants. Confirm whether event organizers need a different handling for notes or attendance history. |
| Event assignments assigned to the deleting member | Preserved as shared community content; assignee disassociated or transferred | Preserve the task with the event and replace the required `AssignedToId` only with an approved unassigned/group-owned identity or a successor who accepts responsibility. Do not transfer responsibility to another person without their consent. If no approved target exists, block deletion pending resolution rather than leave a broken FK. |
| Polls created by the user and group-level polls | Preserved as shared community content; creator disassociated | Preserve the question, options, expiry state, and community relationship; null `CreatedByMemberId`. Polls may be event-linked or group-level, and event deletion currently detaches polls rather than deleting them. |
| Poll votes cast by the deleting member | Permanently deleted | Remove only the member’s votes. `PollVote.MemberId` is required; preserving votes without attribution would require an approved pseudonymous representation/schema change. Other members’ votes and poll options remain. |
| Announcements created by the user | Preserved as shared community content; creator disassociated | Preserve the title/body and community content; null `CreatedByMemberId`. This retains a shared announcement while avoiding attribution to the deleted membership. |
| Photos uploaded by the user, captions, and `FilePath` values | Preserved as shared community content; uploader disassociated or transferred | Proposed default: preserve community photos, remove uploader attribution through an approved group-owned/anonymous owner, and retain the file. The uploader FK is required and the file provider is unknown. If no safe ownership representation is approved, block deletion until product approves deletion of the photo and its verified stored file. |
| Per-member `Notification` records | Permanently deleted | Delete notifications addressed to the member; they are private, member-linked records, not community content. |
| Shared `ActivityFeed` entries with the member as actor | Anonymized/disassociated, with personal metadata removed | Preserve an entry only if it describes continuing shared community activity. Null `ActorMemberId` and scrub any member-identifying values from `MetadataJson`; delete entries that are purely personal or cannot be safely sanitized. The JSON schema is not typed, so all metadata formats must be inspected before implementation. |
| Kickbacks created by the member | Preserved as shared community content; creator disassociated | `CreatedByMemberId` is optional, so creator attribution can be removed while preserving the community record. Any deletion/retention rule for expired kickbacks must be approved separately; the account-deletion policy should not invent one. |
| Kickback responses by the member | Permanently deleted | Remove the member’s response rows; preserve responses from other members. The response has a required member FK. |
| Free-text shared content (event descriptions/location/notes, assignment labels, poll questions/options, announcements, photo captions, kickback text) | Preserved as shared community content; redact attributable personal data | Preserve the community’s useful content, but inspect free text for personal information that identifies the deleted user and remove or redact it under the approved policy. The schema does not distinguish ordinary shared content from personal data embedded in text. |
| External invitation emails/provider records and provider/operational logs | Retention and deletion boundary unknown | No invitation entity or email-delivery audit model was found. Determine whether external providers retain messages, logs, backups, or telemetry and define their deletion/retention periods outside this database workflow. |
| Minimal deletion audit record | Retained for a limited, approved period; no implementation exists | If an audit record is required, retain only a random request ID, processing status, and timestamps; do not retain email, user/member IDs, token material, or deleted content. Product/legal owners must specify the purpose, access controls, and expiration period before creating any audit store. |
| Reserved Unknown Guest system identity | Retained | It is shared platform data used for non-member assignments, not a user account. Exclude its user ID from account-deletion operations. |

## Proposed deletion workflow

1. Authenticate using a user-level JWT and derive the target solely from its
   subject claim. Do not accept a user ID in the request body or route. Require
   a fresh confirmation/re-authentication step approved for the account type.
   `X-Member-Id` alone is not adequate proof of account ownership.
2. Resolve and verify the current user, reject the reserved system identity,
   and perform a read-only preflight of all memberships and dependencies before
   writing anything.
3. For each community, preserve the community and its other members. Identify
   whether the user is the last admin; require approved admin transfer or
   support intervention before proceeding if so. Do not remove memberships
   until creator/actor/assignee/uploader/voter references have been dealt with.
4. Apply the approved dependent-record dispositions in a single database
   transaction where possible: delete personal records; delete or
   disassociate the user’s RSVP/vote/response/notification data; null optional
   creator/actor references; sanitize shared activity metadata; resolve
   required member references according to approved rules; and then remove
   membership records and role assignments.
5. Handle shared photos only after the actual storage provider and ownership
   rules are confirmed. Keep the database record and file lifecycle coordinated
   (prefer an idempotent post-commit/outbox workflow if storage deletion cannot
   participate in the database transaction). Do not report completion while
   file cleanup is ambiguous.
6. Remove password-reset tokens and the account only after required
   disassociation/cleanup has succeeded. Make retry behavior idempotent and
   expose a generic completion/status result without echoing identifiers or
   internal exception details.
7. Address stateless JWT invalidation before launch. A deleted user’s JWT can
   otherwise remain cryptographically valid until expiry; decide on a
   revocation/account-status mechanism or a documented maximum exposure window.
   Removing membership rows will make their `MemberId` credentials unresolved,
   but that alone does not revoke the user’s JWT.
8. Record only the minimum approved audit data. Define external provider,
   operational log, and backup retention/deletion separately; deleting the live
   SQL row does not establish that copies have been removed from those systems.

## Unresolved approvals and dependencies

Product/legal approval is required for:

1. This matrix, especially the retention or deletion of shared event, poll,
   announcement, photo, and activity-feed content.
2. What to do with a last-admin account: successor selection, admin transfer,
   support workflow, or blocking deletion until another admin exists.
3. Whether a member’s event assignments are removed or transferred, and how
   assignment responsibility/notifications are handled.
4. Whether polls retain community-wide results after deleting the user’s votes,
   and whether a future anonymized-vote representation is required.
5. Whether shared photos remain. If they do, approve a safe replacement for the
   required uploader reference and identify the storage provider, path semantics,
   file deletion API, and access/backup lifecycle.
6. Which account types require password re-entry or equivalent fresh
   authentication. Current account registration/login supports passwords, while
   the data model also contains Google/Facebook IDs; no complete federated
   authentication flow was identified in the inspected API.
7. JWT revocation semantics and the exposure period allowed after deletion.
   Stateless access tokens currently have a configurable lifetime (default 24
   hours), and no revocation store exists.
8. The required deletion audit purpose, minimum fields, access policy, and
   retention period. No account-deletion audit record currently exists.
9. External email/provider logs, profile-picture hosting, database backups,
   telemetry, and operational-log retention responsibilities and timelines.
10. Whether additional compliance rules impose a distinct limited retention
    category, including for expired kickbacks. No legal hold, billing, or
    account-deletion retention records were found in the repository.

Technical dependencies before implementation:

- Confirm production database FK behavior against the deployed schema, not just
  the current EF model/migrations. Required `NO ACTION` references must be
  explicitly resolved; blanket cascade deletion is unsafe.
- Identify every `MetadataJson` format and all member-identifying content before
  deciding whether activity entries can be sanitized.
- Confirm actual photo storage and external profile-image handling with
  deployment/product owners; the codebase does not supply a storage abstraction.
- Decide how revocation works for all JWT-authenticated API routes and how
  system/test `MemberId` authentication is constrained in production.
- Design transaction and retry behavior for database and non-transactional file
  deletion, including behavior when cleanup succeeds but the response is lost.
- Coordinate the policy with the in-app and external deletion-request workflows
  referenced by the parent feature. Neither workflow is implemented by this
  discovery document.

## Sources inspected

- `FamilyEventPlanner.Api/Models/User.cs`, `GroupMember.cs`,
  `FamilyGroup.cs`, `FamilyEvent.cs`, `EventAssignment.cs`,
  `EventAttendance.cs`, `Photo.cs`, `Poll.cs`, `PollOption.cs`, `PollVote.cs`,
  `Announcement.cs`, `Notification.cs`, `ActivityFeed.cs`,
  `GroupMembershipRequest.cs`, `CommunityRole.cs`,
  `CommunityRoleAssignment.cs`, `Kickback.cs`, `KickbackResponse.cs`,
  `PasswordResetToken.cs`.
- `FamilyEventPlanner.Api/Data/AppDbContext.cs` and
  `FamilyEventPlanner.Api/Migrations/AppDbContextModelSnapshot.cs`.
- `FamilyEventPlanner.Api/Controllers/AuthController.cs`,
  `EventsController.cs`, `PollsController.cs`,
  `AnnouncementsController.cs`, `KickbacksController.cs`,
  `NotificationsController.cs`, `ActivityFeedController.cs`,
  `FamilyGroupsController.cs`, `GroupMembersController.cs`, and
  `ProfileController.cs`.
- `FamilyEventPlanner.Api/Services/JwtTokenService.cs`,
  `FamilyEventPlanner.Api/Auth/MemberAuthenticationHandler.cs`, and
  `FamilyEventPlanner.Api/Program.cs`.
- `FamilyEventPlanner.Api.Tests/EventsControllerTests.cs` for existing event
  deletion behavior.
