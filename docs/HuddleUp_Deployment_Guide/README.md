# Huddle Up — Troubleshooting and Deployment Notes

This archive collects the steps and findings from the Huddle Up development deployment and Android development-build work.

## Command working directory
The repository root is `~/Development/Sites/HuddleUp/family-event-planner`. Run Docker Compose commands from that directory using `docker compose --env-file FamilyEventPlanner.Api/.env -f FamilyEventPlanner.Api/compose.yaml`. Mobile and Gradle instructions also start at repository root and explicitly change into `FamilyEventPlanner.Mobile` or its `android` subdirectory when required.

## Contents
1. `01-ubuntu-api-deployment.md` — Ubuntu Docker deployment, database restore, Cloudflare Tunnel, and API health checks.
2. `02-docker-compose-connection-string.md` — the environment-variable override that caused the API crash loop.
3. `03-android-eas-development-build.md` — Expo/EAS environment setup and Android APK build steps.
4. `04-gradle-and-android-build-troubleshooting.md` — a safe workflow for diagnosing Gradle/Android build errors.
5. `05-configuration-and-secrets-checklist.md` — environment files, secrets, and safe checks.
6. `06-quick-reference.md` — concise commands and known-good settings.

## Accuracy note
The conversation confirms Gradle errors occurred, but the exact Gradle error text and the specific fix used were not preserved in the available history. The Gradle guide therefore provides a repeatable diagnostic workflow and does not invent a past fix.

## Safety
- Never paste `.env` contents, JWT secrets, database passwords, API keys, EAS tokens, or signing credentials into chat or logs.
- Do not run `source .env`; Docker Compose `.env` files are configuration files, not shell scripts.
- Do not delete or recreate the restored database as a troubleshooting shortcut.
- Do not modify the existing Cloudflare Tunnel or other apps' ports/routes when troubleshooting Huddle Up.
