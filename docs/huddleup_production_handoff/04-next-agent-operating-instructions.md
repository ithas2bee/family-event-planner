# Next Agent --- Huddle Up Production Handoff Instructions

## Read first

Read this package, then the previous Ubuntu deployment guide,
especially: - `02-docker-and-compose-architecture.md` -
`03-environment-configuration-and-secrets.md` -
`04-deploy-and-verify-development-api.md` -
`07-production-readiness-and-open-items.md`

## What is already done

Development was updated from `development` on Ubuntu. Compose validation
and Docker build succeeded. The API container became healthy. Both local
and public development reset-password routes returned HTTP 200. The user
then confirmed the Android APK Forgot Password journey end to end: email
arrived, link opened the reset page, and password changed successfully.

Do not ask the user to repeat this work.

## What is not done

No production deployment was performed. Production host/domain/database,
Cloudflare routing, HTTPS, backups/recovery, production API settings,
production Android package/EAS profile, and Google Play release remain
to be established.

## Critical branch finding

The user reports: - `development` and `staging`: newer Dockerfile
includes Expo web export; root Docker context. - `main`: older API-only
Dockerfile; API-directory Docker context. - All three branches: same
Compose project name, network name, volume name, API port.

Verify these facts against current remote refs before making a
merge/deployment recommendation. This divergence may mean `main` does
not serve the reset-password web page. Shared resource names may be
dangerous if branches/environments run on one Docker host.

## Working rules

-   Be concise, direct, and practical.
-   Ask one or two focused questions at a time.
-   Give exact commands and exact working directory.
-   Say whether each command is read-only or changes state.
-   Do read-only inspection before editing/deploying.
-   Never assume `main` is production until confirmed.
-   Never assume environments use separate hosts.
-   Never reuse development secrets in production.
-   Do not run `docker compose down -v`, delete volumes,
    `docker system prune --volumes`, `git clean -fd`, or
    `git reset --hard` as routine cleanup.
-   Do not expose secrets in logs or documentation.
-   Distinguish verified facts, user-reported findings, assumptions, and
    recommendations.
-   Obtain explicit approval before production changes.

## First task

Start Phase 1 only. Ask whether production will run on the same Ubuntu
host as development/staging or on a separate host. Then establish the
target topology.

Before suggesting a merge into `main`, inspect current remote branch
heads and the full relevant diffs. Do not blindly merge all of
`development`.

Do not proceed to Phase 2 until Phase 1 decisions are documented and
approved.
