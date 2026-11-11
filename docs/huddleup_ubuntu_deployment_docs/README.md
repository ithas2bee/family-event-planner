# Huddle Up --- Ubuntu Deployment Documentation

**Documentation snapshot:** 10 November 2026\
**Scope:** Current development deployment on Ubuntu, based on the
commands, configuration excerpts, screenshots, and successful checks
recorded during the deployment session.

This documentation preserves what is known about the current Ubuntu
setup. It is intentionally explicit about items that were not verified.
It is not a claim that production has already been deployed.

## Document map

1.  [`01-ubuntu-host-and-repository.md`](01-ubuntu-host-and-repository.md)
    --- Ubuntu host, repository location, Git workflow, local
    working-tree precautions.
2.  [`02-docker-and-compose-architecture.md`](02-docker-and-compose-architecture.md)
    --- Dockerfile build stages, Compose services, networks, volumes,
    ports, static web hosting.
3.  [`03-environment-configuration-and-secrets.md`](03-environment-configuration-and-secrets.md)
    --- `.env` location, required settings, secret handling, URL
    configuration.
4.  [`04-deploy-and-verify-development-api.md`](04-deploy-and-verify-development-api.md)
    --- repeatable development build, API-only deployment, health
    checks, HTTP tests.
5.  [`05-database-and-operational-recovery.md`](05-database-and-operational-recovery.md)
    --- SQL Server persistence, bootstrap service, logs, backup
    cautions, troubleshooting.
6.  [`06-android-eas-build-and-release-notes.md`](06-android-eas-build-and-release-notes.md)
    --- EAS Android build environment and current APK verification.
7.  [`07-production-readiness-and-open-items.md`](07-production-readiness-and-open-items.md)
    --- what must be confirmed before production.

## Current verified state

The following was demonstrated during the session:

-   Ubuntu repository path:
    `/home/lencrerot/Development/Sites/HuddleUp`.
-   Git branch pulled: `development`.
-   Git fast-forward: `e2794cf` to `8a36826`.
-   Docker Compose configuration validation completed with no
    output/error using the local `FamilyEventPlanner.Api/compose.yaml`
    and `FamilyEventPlanner.Api/.env`.
-   Docker image build completed successfully. Build output showed the
    Expo web export and .NET API publish stages, and the web export
    copied into API `wwwroot`.
-   API container started with `docker compose ... up -d --no-deps api`.
-   API container status was `Up ... (healthy)`, with host binding
    `127.0.0.1:8090->8080/tcp`.
-   `http://127.0.0.1:8090/reset-password` returned HTTP 200.
-   `https://api-dev.huddleupmobileapp.com/reset-password` returned HTTP
    200.
-   A newly built Android APK was installed/tested by the user. The
    Forgot Password link opened the reset-password web page, and the
    user confirmed the password reset flow worked.

## Important limits of this snapshot

Some deployment files were locally customized and restored from backups
after the Git pull. Therefore, **the exact current contents of the
Ubuntu server's `FamilyEventPlanner.Api/compose.yaml`, `Dockerfile`,
`.env`, and `.dockerignore` were not all re-read after the final
deployment**. The documents describe the configuration evidenced by
command output and excerpts, and identify where the live file must be
checked.

No production deployment was performed in this session. Production
domain, production database, production secrets, reverse-proxy
configuration, TLS certificate management, firewall rules, monitoring,
and rollback process still need explicit confirmation.

## Security

Never put actual passwords, API keys, JWT secrets, private keys,
keystore files, or complete connection strings in these documents or in
Git. The server's `.env` file is private configuration. Redact secrets
before sharing logs or command output.
