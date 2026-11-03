# 1. Ubuntu API Deployment

## Goal
Deploy the Huddle Up API in the development environment at `https://api-dev.huddleupmobileapp.com`.

## Environment
- Repository: `ithas2bee/family-event-planner`
- Branch: `development`
- Directory: `~/Development/Sites/HuddleUp/FamilyEventPlanner.Api`
- API project: `FamilyEventPlanner.Api` (.NET 8, EF Core 8)
- Compose file: `compose.yaml`
- API container: `huddleup-api-1`
- SQL Server container: `huddleup-sqlserver-1`
- API host binding: `127.0.0.1:8090` → container port `8080`
- SQL Server service name inside the Compose network: `sqlserver`
- Database: `FamilyEventPlannerDb`
- Existing Cloudflare Tunnel: `ubuntu-server-tunnel`

Do not alter the existing PresiCompare or Byron Professional Site deployments, their ports, or their Cloudflare routes.

## Deployment files
The API deployment includes `Dockerfile`, `.dockerignore`, `compose.yaml`, `.env`, `.env.example`, and `database/bootstrap.sql`.

Compose starts SQL Server, runs the one-shot `db-init` service, then starts the API. The `db-init` service exiting after successful completion is expected.

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
docker compose ps
docker compose logs --tail=80 api
```

Inspect logs before changing configuration. Redact credentials before sharing output.

## Safe API restart
Only recreate the API after the resolved configuration has been verified:

```bash
docker compose up -d --force-recreate api
docker compose ps
```

This targets Huddle Up's API service, not the other server applications.

## Cloudflare
The existing tunnel route maps `api-dev.huddleupmobileapp.com` to `http://localhost:8090`. Since the public health endpoint worked, do not change tunnel or DNS configuration unless new evidence points to a routing problem.
