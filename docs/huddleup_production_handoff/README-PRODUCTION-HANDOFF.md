# Huddle Up --- Production Deployment Handoff

**Prepared:** 10 November 2026

This package supplements the Ubuntu development deployment guide. It
preserves the production roadmap and the branch differences reported by
the user. It does not claim production is deployed.

## Contents

-   `01-production-roadmap.md` --- six phases and exit gates.
-   `02-branch-differences-and-deployment-risk.md` --- reported
    differences across `development`, `staging`, and `main`.
-   `03-production-decisions-and-open-questions.md` --- decisions the
    next agent must obtain.
-   `04-next-agent-operating-instructions.md` --- handoff instructions
    and safe first task.

## Current verified development state

The Ubuntu development deployment was built and tested. The API
container became healthy; local and public development `/reset-password`
URLs returned HTTP 200. The user then confirmed the Android APK Forgot
Password journey end to end: email arrived, the link opened the reset
page, and the password was successfully changed.

No production deployment was performed in the recorded work.

## Critical reported branch finding

The user reports: - `development` and `staging` have the newer
Dockerfile that builds Expo web assets into the API image. - `main`
still has the older API-only Dockerfile. - `development` and `staging`
use repository-root Docker build context. - `main` uses the API
directory as build context. - All three branches use the same Compose
project name, network name, volume name, and API port.

These are user-provided findings, not independently re-verified while
creating this package. The next agent must inspect current branch heads
and exact files before merging or deploying.

If environments share a Docker host, identical Compose resource names
and host ports may cause resource reuse, data-isolation mistakes, or
port conflicts. Confirm the host topology before changing names or
volumes.

## Safety

Do not assume `main` is production-ready or merge all of `development`
blindly. Do not run destructive Git/Docker cleanup. Never put secrets in
documentation. Keep development and production credentials separate.
