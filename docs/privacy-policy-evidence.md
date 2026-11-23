# Huddle Up privacy policy review

## Public policy URL

The policy route is served by the API's static web root:

`https://api-dev.huddleupmobileapp.com/privacy`

The API host is publicly HTTPS-accessible in the development deployment. This URL is a deployment target, not proof that the updated page has been published. Rebuild and deploy the API image, then verify the URL without signing in. The deployment guide identifies this hostname as development; before a production Google Play submission, use the selected production HTTPS hostname with the same `/privacy` path, deploy the page there, and verify that exact URL.

## Repository review

The policy content was checked against the following implementation and configuration:

| Area | Evidence reviewed | Confirmed behavior |
| --- | --- | --- |
| Account and registration | `FamilyEventPlanner.Api/Models/User.cs`; `FamilyEventPlanner.Api/Models/Auth/RegisterRequest.cs`; `FamilyEventPlanner.Api/Controllers/AuthController.cs`; `FamilyEventPlanner.Mobile/app/create-account.tsx`; `FamilyEventPlanner.Api/appsettings.json` | Email, display name and hashed password are collected at registration. Date of birth is used for age eligibility and not persisted. Minimum age is configurable (currently 14). Profile age is a separate editable field. |
| Profile and community access | `FamilyEventPlanner.Api/Controllers/ProfileController.cs`; `FamilyEventPlanner.Mobile/app/privacy.tsx`; `FamilyEventPlanner.Mobile/app/edit-profile.tsx` | Profile supports age, free-text location, biography, profile-picture URL and roles. Member profiles can expose details to members of shared communities. No per-field privacy switches are offered. |
| Community content | `FamilyEventPlanner.Api/Data/AppDbContext.cs`; `FamilyEventPlanner.Api/Models/`; `FamilyEventPlanner.Api/Controllers/` | The API stores community memberships and roles, events, attendance, assignments, polls and votes, announcements, kickbacks/responses, photos, activity-feed records and in-app notifications. Shared-content access depends on community membership and settings. |
| Place search and maps | `FamilyEventPlanner.Mobile/services/locationService.ts`; `FamilyEventPlanner.Api/Controllers/LocationsController.cs`; `FamilyEventPlanner.Api/Services/GooglePlacesService.cs`; `FamilyEventPlanner.Mobile/components/events/maplibreMapConfig.js`; `FamilyEventPlanner.Mobile/app.config.js` | User-entered place-search text and place IDs are sent through the API to Google Places; selected place details include address and coordinates. Android's map style is hosted by OpenFreeMap; Google Maps integration is configured for iOS. No device GPS collection or background location API was found in the reviewed app code. |
| Email and authentication | `FamilyEventPlanner.Api/Services/ResendEmailSender.cs`; `FamilyEventPlanner.Api/Controllers/AuthController.cs`; `FamilyEventPlanner.Mobile/services/sessionService.ts`; `FamilyEventPlanner.Mobile/app.json` | Resend sends account email when configured. Passwords are hashed and the app stores its session with platform secure storage. Social-provider identifiers exist as legacy model fields, but a social sign-in integration was not found. |
| Account deletion and retention | `docs/account-deletion-data-handling.md`; `docs/account-deletion-external-workflow.md`; `FamilyEventPlanner.Api/Controllers/AccountDeletionController.cs`; `FamilyEventPlanner.Api/Controllers/ExternalAccountDeletionController.cs`; `FamilyEventPlanner.Api/Services/AccountDeletionService.cs`; `FamilyEventPlanner.Api/Services/ContentExpirationService.cs` | In-app deletion requires password and `DELETE`; external deletion uses an email verification flow at `/delete-account`. Private account-linked data is deleted; supported shared-content attribution is disassociated while shared content/files are retained. The non-identifying deletion audit is scheduled for removal after 30 days, but processor outages can delay removal; deletion links expire after 30 minutes. Polls and announcements with no expiry or an elapsed expiry are periodically removed. |
| Service integrations and configuration | `FamilyEventPlanner.Api/Program.cs`; `FamilyEventPlanner.Api/compose.yaml`; `FamilyEventPlanner.Mobile/package.json`; `FamilyEventPlanner.Mobile/app.config.js`; `FamilyEventPlanner.Mobile/app.json` | SQL Server backs the API. Google Places and Resend are configured integrations. No advertising, analytics or crash-reporting SDK appears in the reviewed mobile dependencies/configuration. Hosting region, backup retention, and provider operational-log retention are not established by these files. |
| Contact | `FamilyEventPlanner.Mobile/app.json`; `FamilyEventPlanner.Mobile/services/supportService.ts` | The configured support contact is `lencrerotl0@gmail.com`. |

## Release-candidate check before Play submission

This repository review does not establish production hosting, data region, backup/operational-log retention, or whether the release candidate has changed integrations. Before submitting, verify the release build and deployment configuration, confirm the production host and provider list, test `GET https://<production-host>/privacy` without authentication, verify the deletion page and workflow at the same host, and update this policy if release behavior differs.
