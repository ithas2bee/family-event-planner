# 1. Ubuntu API Deployment

## Goal
Deploy the Huddle Up API in the development environment at `https://api-dev.huddleupmobileapp.com`.

## Environment
- Repository: `ithas2bee/family-event-planner`
- Branch: `development`
- Directory: `~/Development/Sites/HuddleUp/family-event-planner` (repository root)
- API project: `FamilyEventPlanner.Api` (.NET 8, EF Core 8)
- Compose file: `FamilyEventPlanner.Api/compose.yaml`
- API container: `huddleup-api-1`
- SQL Server container: `huddleup-sqlserver-1`
- Compose services: `sqlserver` and `api` (`db-init` is not defined)
- API host binding: `127.0.0.1:8090` → container port `8080`
- SQL Server service name inside the Compose network: `sqlserver`
- Database: `FamilyEventPlannerDb`
- Existing Cloudflare Tunnel: `ubuntu-server-tunnel`

Do not alter the existing PresiCompare or Byron Professional Site deployments, their ports, or their Cloudflare routes.

## Deployment files
The development Compose build uses the repository root as its context so the API image can include the Expo static web export. Set `PasswordReset__WebUrl=https://api-dev.huddleupmobileapp.com/reset-password` in the API deployment `.env`; the corresponding Compose setting defaults to this development route. The API deployment also includes `FamilyEventPlanner.Api/Dockerfile`, `FamilyEventPlanner.Api/.env`, `FamilyEventPlanner.Api/.env.example`, `FamilyEventPlanner.Api/compose.yaml`, and `FamilyEventPlanner.Api/database/bootstrap.sql`.

## Build and deploy
Run these commands from the repository root. Create `FamilyEventPlanner.Api/.env` from the example, set every required value, and verify that the connection string targets `FamilyEventPlannerDb` on `sqlserver` using the `huddleup_app` credentials before building or starting containers. Set its `Password` value to the same strong value used for `APP_DB_PASSWORD` and retain `Encrypt=True;TrustServerCertificate=True`.

```bash
cd ~/Development/Sites/HuddleUp/family-event-planner
cp -n FamilyEventPlanner.Api/.env.example FamilyEventPlanner.Api/.env
chmod 600 FamilyEventPlanner.Api/.env
```

Edit `FamilyEventPlanner.Api/.env` with the deployment's actual credentials and connection string. To build the API image directly and verify the repository-root Docker context:

```bash
docker build \
  --file FamilyEventPlanner.Api/Dockerfile \
  --tag huddleup-api:build-check \
  --build-arg EXPO_PUBLIC_API_BASE_URL=https://api-dev.huddleupmobileapp.com \
  .
```

For deployment, validate the Compose configuration, build the API service, and start the services using the Compose file in the API directory:

```bash
docker compose --env-file FamilyEventPlanner.Api/.env -f FamilyEventPlanner.Api/compose.yaml config --quiet
docker compose --env-file FamilyEventPlanner.Api/.env -f FamilyEventPlanner.Api/compose.yaml build api
docker compose --env-file FamilyEventPlanner.Api/.env -f FamilyEventPlanner.Api/compose.yaml up -d
docker compose --env-file FamilyEventPlanner.Api/.env -f FamilyEventPlanner.Api/compose.yaml ps
docker compose --env-file FamilyEventPlanner.Api/.env -f FamilyEventPlanner.Api/compose.yaml logs --tail=80 api
```

Compose builds from the repository root (`context: ..`) and uses `FamilyEventPlanner.Api/Dockerfile`. The Compose file defines only `sqlserver` and `api`; there is no `db-init` service. SQL Server receives `database/bootstrap.sql` as a read-only mount; do not expect Compose to run a one-shot database initialization service.

Verify that the built image includes the exported Expo application and static assets:

```bash
docker run --rm --entrypoint sh huddleup-api:build-check -c \
  'test -s /app/wwwroot/index.html && test -d /app/wwwroot/_expo/static && find /app/wwwroot -type f | wc -l'
```

## Database restore
The original Windows development database used LocalDB:

`Server=(localdb)\\MSSQLLocalDB;Database=FamilyEventPlannerDb;Trusted_Connection=True;TrustServerCertificate=True;`

A backup was created on Windows, transferred to Ubuntu, copied into the SQL Server container, and restored as `FamilyEventPlannerDb`. The restore completed successfully and processed 785 pages.

The restored database contained 18 tables, including `Users`, `FamilyGroups`, `GroupMembers`, `FamilyEvents`, `EventAssignments`, `EventAttendances`, `Polls`, `PollOptions`, `PollVotes`, and `__EFMigrationsHistory`. The user subsequently reported the app appeared to be working.

## Public health check
Run:

```bash
curl -i https://api-dev.huddleupmobileapp.com/health/ready
```

Known-good response: HTTP `200` and `{"status":"ready"}`.

## Container health and logs

```bash
docker compose --env-file FamilyEventPlanner.Api/.env -f FamilyEventPlanner.Api/compose.yaml ps
docker compose --env-file FamilyEventPlanner.Api/.env -f FamilyEventPlanner.Api/compose.yaml logs --tail=80 api
```

Inspect logs before changing configuration. Redact credentials before sharing output.

## Safe API restart
Only recreate the API after the resolved configuration has been verified:

```bash
docker compose --env-file FamilyEventPlanner.Api/.env -f FamilyEventPlanner.Api/compose.yaml up -d --force-recreate api
docker compose --env-file FamilyEventPlanner.Api/.env -f FamilyEventPlanner.Api/compose.yaml ps
```

This targets Huddle Up's API service, not the other server applications.

## Cloudflare
The existing tunnel route maps `api-dev.huddleupmobileapp.com` to `http://localhost:8090`. Since the public health endpoint worked, do not change tunnel or DNS configuration unless new evidence points to a routing problem.
