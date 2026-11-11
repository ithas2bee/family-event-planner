# 2. Docker and Compose Architecture

## 2.1 Overview

The Ubuntu deployment runs the .NET API and SQL Server in Docker
Compose. The API image is multi-stage: it exports the Expo mobile
project as a static web application, publishes the .NET API, and copies
both outputs into the final ASP.NET runtime image.

The static web application is served by the API from `wwwroot`. This is
what allows the password-reset email to direct a user to a browser page
such as:

``` text
https://api-dev.huddleupmobileapp.com/reset-password
```

The deployment session verified that both the local and public
development reset-password URLs returned HTTP 200.

## 2.2 Compose services

The Compose configuration shown during the session defined these
services:

### `sqlserver`

-   Image: `mcr.microsoft.com/mssql/server:2022-latest`
-   SQL Server data volume: `huddleup_sql_data`
-   Bootstrap SQL mounted read-only from `./database/bootstrap.sql`
-   Environment includes `ACCEPT_EULA`, `MSSQL_PID`,
    `MSSQL_SA_PASSWORD`, and `APP_DB_PASSWORD`
-   Health check uses `sqlcmd` against localhost.
-   Restart policy: `unless-stopped`

The Compose configuration requires `MSSQL_PID` to be set to an
appropriate licensed SQL Server edition. Confirm licensing and the
intended edition before production.

### `db-init`

A one-shot initialization service uses the SQL Server 2022 image and
runs `database/bootstrap.sql` after SQL Server becomes healthy.

The command waits for SQL Server to respond, then invokes `sqlcmd` with
`AppDbPassword` supplied from `APP_DB_PASSWORD`.

It has:

``` yaml
depends_on:
  sqlserver:
    condition: service_healthy
restart: "no"
```

A successful one-shot `db-init` container may exit after doing its work.
An exited status is expected for a completed one-shot initialization
task; inspect its exit code and logs rather than treating every stopped
state as a failure.

### `api`

-   Built from the repository root using
    `FamilyEventPlanner.Api/Dockerfile`.
-   Runs the .NET API on container port `8080`.
-   Runs with `ASPNETCORE_ENVIRONMENT=Production`.
-   Uses the SQL Server connection string and JWT/email/Places
    configuration supplied through environment variables.
-   Publishes host port `8090` only on loopback:

``` yaml
ports:
  - "127.0.0.1:8090:8080"
```

-   Health check requests:

``` text
http://127.0.0.1:8080/health/ready
```

-   Restart policy: `unless-stopped`.

The local host binding means the API is not directly exposed on all host
interfaces. A reverse proxy is expected to route public HTTPS traffic to
the local service, but the proxy implementation was not inspected in
this session.

## 2.3 Docker build context

The successful build was run from the repository root:

``` bash
cd /home/lencrerot/Development/Sites/HuddleUp
```

The Compose build configuration shown in the local file used:

``` yaml
build:
  context: .
  dockerfile: FamilyEventPlanner.Api/Dockerfile
```

The root build context is necessary because the Dockerfile needs both:

-   `FamilyEventPlanner.Api/`
-   `FamilyEventPlanner.Mobile/`

Do not run the repository-root Dockerfile build from the API
subdirectory with `.` as the context. That was the cause of an earlier
`COPY FamilyEventPlanner.Api.csproj` failure: Docker could not find the
project file relative to the supplied context.

## 2.4 Dockerfile build stages

The successful build output showed these major operations:

1.  Load .NET SDK and ASP.NET runtime base images.
2.  Load Node image for the Expo web build.
3.  Restore and publish the .NET API.
4.  Install mobile dependencies using `npm ci`.
5.  Run Expo static web export.
6.  Copy API publish output and exported web assets into the final
    runtime image.
7.  Tag the image as `huddleup-api:latest`.

The Dockerfile version visible in the successful build output used a
Node 22 Alpine build stage and an Expo export output directory named
`/app/web-dist`. The final image copied that web export into
`/app/wwwroot`.

**Important:** A previous local working Dockerfile diff showed a
different Node base image and an Expo `dist` output path. The final
successful build log is the best evidence of what was actually built at
that time. Check the current file before copying snippets or changing
output paths:

``` bash
sed -n '1,240p' FamilyEventPlanner.Api/Dockerfile
```

The Expo export directory and the Docker `COPY` source must match
exactly. If one is changed, update the other in the same change.

## 2.5 Compose project, network, and volume

The Compose file shown in the session used:

-   Compose project name: `huddleup`
-   Network: `huddleup-network`
-   Named SQL data volume: `huddleup_sql_data`

The named volume is the persistent SQL Server data store. Recreating the
API container does not require deleting or recreating this volume.

Never run `docker compose down -v` as a routine API deployment step. The
`-v` option removes named volumes and can destroy database data.

## 2.6 Build argument and static web configuration

The Expo build receives:

``` text
EXPO_PUBLIC_API_BASE_URL=https://api-dev.huddleupmobileapp.com
```

This value is embedded into the exported web/mobile bundle at build
time. It is not equivalent to an ordinary runtime API environment
variable. A production mobile/web build must use the production API base
URL.

The password reset web URL was configured in the API's runtime
configuration in the local Compose file as:

``` text
PasswordReset__WebUrl=https://api-dev.huddleupmobileapp.com/reset-password
```

Do not carry this development URL into production. Set the production
reset URL explicitly when production is prepared.

## 2.7 High-level topology

``` text
Internet
   |
   | HTTPS
   v
Reverse proxy / TLS endpoint
   |
   | HTTP to loopback host port (proxy details not verified)
   v
Ubuntu host 127.0.0.1:8090
   |
   | Docker port mapping
   v
huddleup API container :8080
   |                    |
   |                    +--> wwwroot (Expo static web export)
   |
   +--> SQL Server service on huddleup-network
              |
              +--> persistent volume huddleup_sql_data

db-init is a one-shot service that initializes the SQL database
after SQL Server is healthy.
```
