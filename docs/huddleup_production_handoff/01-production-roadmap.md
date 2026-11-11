# Huddle Up Production Roadmap

Work through these phases in order. Each phase needs an explicit exit
gate before proceeding.

## Phase 1 --- Establish the production environment

Decide: - Where production runs: same Ubuntu host, separate host, or
other platform. - Production domain and API hostname. - SQL Server
location and connectivity. - Whether production has its own SQL Server
instance/database and persistent storage. - How production is isolated
from development and staging. - Which Git branch or release tag is the
production source of truth.

**Exit gate:** Written and approved topology covering host, domain, API
endpoint, database endpoint, isolation boundary, and release source.

## Phase 2 --- Prepare production infrastructure

Prepare: - Production-specific Docker Compose configuration. -
Production `.env` and secret provisioning. - Production database and
initialization. - Cloudflare DNS/routing and HTTPS/TLS. - Firewall and
exposed-port review. - Automated database backups, off-host storage,
retention, and tested restore. - Distinct Compose
project/network/volume/container names and host ports if environments
share a Docker host.

**Exit gate:** Production infrastructure is isolated, secrets protected,
HTTPS verified, and backup/restore tested.

## Phase 3 --- Prepare the API for production

Review: - EF Core migrations and migration execution strategy. - Startup
behavior and readiness/liveness health checks. - Authentication, JWT
issuer/audience/secret. - Email provider, sender identity, and
credentials. - Password-reset URL and complete reset flow. - CORS
origins. - Production configuration and absence of development URLs. -
Logging, retention, and sensitive-value redaction.

**Exit gate:** API production configuration reviewed; migrations
understood; critical API behavior tested in a production-like
environment.

## Phase 4 --- Prepare the Android production release

Confirm: - Production Android package/application ID. - EAS production
profile and environment. - Production `EXPO_PUBLIC_API_BASE_URL`. -
Production Google Maps key and restrictions. - Signing credentials. -
Version name and Android version code. - AAB artifact for Google Play,
if that is the target. - Release artifact storage and reproducibility.

**Exit gate:** Signed production AAB built and tested against production
API, with no development identity or endpoints.

## Phase 5 --- Production validation

Deploy and validate: - API container health and database
connectivity/schema. - Authentication and critical app workflows. -
Email delivery and password recovery from production app. - Android
release connectivity to production. - HTTPS, routing, CORS, health
checks, logs, monitoring. - Backup status and rollback readiness.

**Exit gate:** Agreed smoke tests pass, no critical defects remain,
rollback is available.

## Phase 6 --- Google Play release

Prepare: - Store listing and description. - Icon, feature graphic,
screenshots. - Privacy policy, Data Safety form, and required
declarations. - Internal/closed testing track as applicable. - Testers,
feedback, production rollout, and monitoring.

**Exit gate:** Current Google Play requirements for this app/account are
satisfied; release and monitoring ownership are clear.

## Change control

For every phase record decisions, files changed, commands run, test
evidence, risks, remaining work, and explicit approval to proceed.
