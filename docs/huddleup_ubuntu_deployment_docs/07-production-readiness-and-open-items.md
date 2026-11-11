# 7. Production Readiness and Open Items

## 7.1 Current status

The development deployment and password recovery flow were verified.
Production deployment has not yet been performed in the recorded
session.

The following are confirmed for development: - Development branch was
pulled on Ubuntu. - Docker image built successfully. - API container
started and became healthy. - Local reset-password route returned HTTP
200. - Public development reset-password route returned HTTP 200. - A
development Android APK completed the Forgot Password journey
successfully.

These facts do not establish production readiness by themselves.

## 7.2 Production release checklist

### Source and release control

-   [ ] Confirm the production branch name (the prior discussion asked
    whether `main` is production; this was not answered).
-   [ ] Review the exact commits to be released.
-   [ ] Confirm all intended changes are merged and approved.
-   [ ] Record the release commit SHA.
-   [ ] Ensure no unreviewed local server changes are accidentally
    included.
-   [ ] Tag the release if that is the team's release convention.

### Production Ubuntu configuration

-   [ ] Confirm whether production uses the same Ubuntu host or a
    separate host.
-   [ ] Confirm repository path and deployment user.
-   [ ] Confirm Docker Engine and Compose versions.
-   [ ] Confirm production Compose file and Dockerfile are the approved
    versions.
-   [ ] Confirm the production reverse proxy and upstream target.
-   [ ] Confirm DNS points to the intended production host.
-   [ ] Confirm TLS certificate validity and renewal.
-   [ ] Confirm firewall rules and exposed ports.
-   [ ] Confirm API is bound only to the intended interface (development
    was bound to `127.0.0.1:8090`).
-   [ ] Confirm log rotation and disk-space monitoring.

### Production secrets and integrations

-   [ ] Create production-only API `.env` values.
-   [ ] Set strong unique SQL Server SA and application DB passwords.
-   [ ] Confirm SQL Server edition and licensing.
-   [ ] Set a unique production JWT secret.
-   [ ] Set production JWT issuer and audience.
-   [ ] Configure production Google Places API key.
-   [ ] Configure production Resend API key.
-   [ ] Verify sender domain and sender address with the email provider.
-   [ ] Configure production CORS allowed origins.
-   [ ] Set production password-reset web URL.
-   [ ] Verify all secret files are excluded from Git and protected by
    filesystem permissions.
-   [ ] Do not reuse development credentials.

### Database

-   [ ] Confirm whether production requires a new database or migration
    of existing data.
-   [ ] Review EF Core migrations and bootstrap SQL.
-   [ ] Take a verified pre-deployment backup.
-   [ ] Store a backup off-host.
-   [ ] Test restoring the backup.
-   [ ] Confirm data retention and recovery objectives.
-   [ ] Confirm bootstrap behavior is safe for the existing database.
-   [ ] Confirm SQL Server volume and storage capacity.

### API deployment and smoke tests

-   [ ] Validate production Compose configuration.
-   [ ] Build the production API image from the approved commit.
-   [ ] Confirm static Expo web export uses the production API URL.
-   [ ] Deploy using a documented maintenance/rollback plan.
-   [ ] Confirm API container health.
-   [ ] Test public HTTPS health/readiness endpoint.
-   [ ] Test authentication.
-   [ ] Test password reset email delivery and browser link.
-   [ ] Test password update and sign-in using the new password.
-   [ ] Test critical event/group functionality.
-   [ ] Inspect API and reverse-proxy logs.
-   [ ] Confirm no development URLs appear in production emails or app
    configuration.

### Google Play release

-   [ ] Confirm production Android package/application ID.
-   [ ] Confirm production EAS profile and environment.
-   [ ] Confirm production API base URL and Maps key.
-   [ ] Confirm release signing credentials.
-   [ ] Update app version and Android version code.
-   [ ] Build the production AAB for Google Play Console.
-   [ ] Test the release build before submission.
-   [ ] Prepare store listing, screenshots, privacy policy, data safety
    information, and required declarations.
-   [ ] Complete Google Play Console testing-track requirements.
-   [ ] Recruit the required testers and collect feedback.
-   [ ] Submit for review only after release checks pass.

## 7.3 Rollback planning

A production deployment needs a rollback plan before the first
production change. At minimum, preserve: - The previous known-good API
image tag/digest. - The previous production Compose configuration. - The
previous production environment file in secure backup. - A verified
database backup. - The release commit SHA.

Rolling back application code does not automatically roll back database
schema changes. Database rollback must be designed separately.

## 7.4 Open questions that must be answered

The deployment session did not establish:

1.  Is `main` the production branch?
2.  Is production on this same Ubuntu server or another host?
3.  What is the production API domain?
4.  What reverse proxy is installed (Nginx, Caddy, Traefik, or another)?
5.  Is there an existing production database with real user data?
6.  Is the production database SQL Server on this host or a
    managed/external service?
7.  What is the production Android package ID?
8.  Is the target Play Console artifact an AAB, and are signing
    credentials configured?
9.  What are the current Google Play Console testing requirements for
    this app/account?
10. What backup/restore process is in place?

Do not infer answers to these questions from the development deployment.
