# 5. Database and Operational Recovery

## 5.1 SQL Server container and persistent data

The Compose configuration shown during the deployment used:

``` text
mcr.microsoft.com/mssql/server:2022-latest
```

The persistent named volume was:

``` text
huddleup_sql_data
```

It is mounted at SQL Server's data directory:

``` text
/var/opt/mssql
```

The Compose network was:

``` text
huddleup-network
```

The API connects to SQL Server using the service name `sqlserver` on the
Compose network. The connection string targets database
`FamilyEventPlannerDb` and application login `huddleup_app`.

A named Docker volume is separate from the API image. Rebuilding or
replacing the API image should not require changing the database volume.

## 5.2 Database bootstrap service

The `db-init` service mounts:

``` text
FamilyEventPlanner.Api/database/bootstrap.sql
```

inside the SQL Server container at:

``` text
/opt/huddleup/bootstrap.sql
```

The service waits until SQL Server accepts a query, then runs `sqlcmd`
with the application DB password passed as `AppDbPassword`.

The service is configured with `restart: "no"` and depends on
`sqlserver` being healthy. It is a one-shot initialization service, not
a continuously running API dependency.

Do not assume rerunning bootstrap is harmless. Read `bootstrap.sql` and
determine whether it is idempotent before manually rerunning it against
an existing database.

## 5.3 Inspect service status

From repository root:

``` bash
docker compose \
  --env-file FamilyEventPlanner.Api/.env \
  -f FamilyEventPlanner.Api/compose.yaml \
  ps
```

Inspect API logs:

``` bash
docker compose \
  --env-file FamilyEventPlanner.Api/.env \
  -f FamilyEventPlanner.Api/compose.yaml \
  logs --tail=100 api
```

Inspect SQL Server logs:

``` bash
docker compose \
  --env-file FamilyEventPlanner.Api/.env \
  -f FamilyEventPlanner.Api/compose.yaml \
  logs --tail=100 sqlserver
```

Inspect database initializer logs:

``` bash
docker compose \
  --env-file FamilyEventPlanner.Api/.env \
  -f FamilyEventPlanner.Api/compose.yaml \
  logs --tail=100 db-init
```

Redact passwords, tokens, and connection-string credentials before
sharing logs.

## 5.4 Safe API-only update

The successful API-only update command was:

``` bash
docker compose \
  --env-file FamilyEventPlanner.Api/.env \
  -f FamilyEventPlanner.Api/compose.yaml \
  up -d --no-deps api
```

This was used after the image build. It does not request Compose to
start or recreate dependency services.

## 5.5 Commands that require special care

Do not run these casually:

``` bash
docker compose down -v
docker volume rm huddleup_sql_data
docker system prune --volumes
git clean -fd
git reset --hard
```

Potential impact: - `down -v` removes Compose-managed volumes. -
Removing `huddleup_sql_data` can delete the database. - Pruning volumes
can remove data not currently attached to a container. - `git clean -fd`
removes untracked files, including local backups. - `git reset --hard`
discards tracked local changes.

## 5.6 Backups and restore

The deployment session did not verify an automated SQL backup schedule,
off-host backup destination, restore procedure, or recovery-point
objective. These must be established before production.

At minimum, production operations should document: - How full and
transaction-log backups are created. - Where encrypted backups are
stored off the Ubuntu host. - Retention schedule. - Who can access
backups. - How a restore is tested. - Recovery point objective
(acceptable data loss). - Recovery time objective (acceptable outage).

Do not treat the Docker named volume as a backup. It is persistent
storage on the same host and can be lost with the host or disk.
