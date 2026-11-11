# 4. Development API Deployment Runbook

This runbook records the deployment sequence that succeeded on the
Ubuntu development server. It updates the API service only. It is not a
production release procedure.

## 4.1 Preconditions

-   Repository root is `/home/lencrerot/Development/Sites/HuddleUp`.
-   Intended branch is `development`.
-   Local API `.env` exists at `FamilyEventPlanner.Api/.env`.
-   Local Compose file is `FamilyEventPlanner.Api/compose.yaml`.
-   Docker Engine and Compose are available.
-   Local server-specific Compose and `.env` customizations have been
    preserved.
-   The current Dockerfile's Expo export output matches its final `COPY`
    source.

Start with:

``` bash
cd /home/lencrerot/Development/Sites/HuddleUp
pwd
git branch --show-current
git log -1 --oneline
git status --short
```

## 4.2 Validate Compose configuration

The exact validation command used successfully:

``` bash
docker compose \
  --env-file FamilyEventPlanner.Api/.env \
  -f FamilyEventPlanner.Api/compose.yaml \
  config --quiet
```

Success is indicated by returning to the shell prompt without an error.
`--quiet` suppresses the rendered configuration.

If validation fails, do not build or deploy. Correct the YAML or missing
environment variables first. Do not paste secret values when requesting
help.

## 4.3 Build the API image

The command used successfully:

``` bash
docker compose \
  --env-file FamilyEventPlanner.Api/.env \
  -f FamilyEventPlanner.Api/compose.yaml \
  build api
```

The build output confirmed: - Node build stage loaded. - Expo
dependencies installed. - Expo web export completed. - .NET API restored
and published. - Static web assets copied into API `wwwroot`. - Final
image was exported and tagged as `huddleup-api:latest`.

This step builds the image; it does not itself deploy or replace the
running container.

## 4.4 Deploy only the API service

The command used successfully:

``` bash
docker compose \
  --env-file FamilyEventPlanner.Api/.env \
  -f FamilyEventPlanner.Api/compose.yaml \
  up -d --no-deps api
```

`--no-deps` prevents Compose from starting/recreating dependency
services as part of this API-only update. This is appropriate only when
the existing SQL Server/database services are already running and
healthy.

The observed output was:

``` text
Container huddleup-api-1 Started
```

Do not add `--remove-orphans`, `down`, or `-v` to this routine API
update without understanding the impact.

## 4.5 Verify container health

Command:

``` bash
docker compose \
  --env-file FamilyEventPlanner.Api/.env \
  -f FamilyEventPlanner.Api/compose.yaml \
  ps api
```

Observed healthy result:

``` text
NAME             IMAGE          COMMAND                  SERVICE   CREATED          STATUS                    PORTS
huddleup-api-1   huddleup-api   "dotnet FamilyEventP…"   api       ...              Up ... (healthy)           127.0.0.1:8090->8080/tcp
```

The key condition is `healthy`, not merely `Up`.

If it is unhealthy, inspect logs before restarting repeatedly:

``` bash
docker compose \
  --env-file FamilyEventPlanner.Api/.env \
  -f FamilyEventPlanner.Api/compose.yaml \
  logs --tail=100 api
```

## 4.6 Verify the reset-password page locally

Command:

``` bash
curl -sS -o /dev/null -w "HTTP status: %{http_code}\n" \
  http://127.0.0.1:8090/reset-password
```

Observed result:

``` text
HTTP status: 200
```

This verifies that the API container responds with an HTTP 200 for the
reset route from the Ubuntu host. It does not by itself verify that the
reset form submits successfully.

## 4.7 Verify the public development HTTPS route

Command:

``` bash
curl -sS -o /dev/null -w "HTTP status: %{http_code}\n" \
  https://api-dev.huddleupmobileapp.com/reset-password
```

Observed result:

``` text
HTTP status: 200
```

This verifies that the public development URL returns HTTP 200 through
the public HTTPS path.

## 4.8 Functional verification performed

After the API deployment, the user built and installed an Android APK.
The user confirmed that:

1.  The APK installed and ran.
2.  The Forgot Password link worked.
3.  The reset email arrived.
4.  The email button redirected to the reset-password browser page.
5.  The user completed the password reset successfully.

This is stronger evidence than an HTTP 200 check: it verifies the actual
password-recovery flow from the mobile app through email and the browser
page.

## 4.9 What this runbook does not do

It does not: - Deploy production. - Build a production Android App
Bundle. - Change DNS, TLS, reverse proxy, or firewall configuration. -
Migrate or restore the database. - Rotate secrets. - Verify backups or
disaster recovery. - Confirm production email deliverability.
