# 2. Docker Compose Connection-String Failure

## Symptoms
After restoring the existing database, the API entered a restart loop. Logs showed a SQL Server pre-login handshake failure and:

`The remote certificate was rejected by the provided RemoteCertificateValidationCallback`

The failure occurred during EF Core startup migration at `Program.cs:line 186`, where `Database.MigrateAsync()` was called. The public endpoint temporarily returned HTTP 502 while the API was unavailable.

The intended connection string was structurally:

`Server=sqlserver,1433;Database=FamilyEventPlannerDb;User Id=huddleup_app;Password=[REDACTED];Encrypt=True;TrustServerCertificate=True;`

Never put the real password in documentation.

## Diagnostic evidence
The running container showed only:

`ConnectionStrings__DefaultConnection=Server=sqlserver,1433`

The resolved Compose configuration also failed checks for:
- `Database=FamilyEventPlannerDb`
- `User Id=huddleup_app`
- `Encrypt=True`
- `TrustServerCertificate=True`

## Confirmed root cause
The shell had an exported environment variable named `ConnectionStrings__DefaultConnection`. Docker Compose gives shell environment variables precedence over `.env`. The shell value contained only the server prefix and overrode the complete value in `.env`.

Safe existence check:

```bash
printenv ConnectionStrings__DefaultConnection >/dev/null \\
  && echo "Shell override exists" \\
  || echo "No shell override"
```

It reported `Shell override exists`.

## Fix used
Remove the incorrect override from the current shell:

```bash
unset ConnectionStrings__DefaultConnection
```

From the repository root, check the resolved Compose configuration without printing the connection string:

```bash
docker compose --env-file FamilyEventPlanner.Api/.env -f FamilyEventPlanner.Api/compose.yaml config --format json | python3 -c '
import json,sys
s=json.load(sys.stdin)["services"]["api"]["environment"].get("ConnectionStrings__DefaultConnection","")
print("Length:", len(s))
print("Database present:", "Database=FamilyEventPlannerDb" in s)
print("App login present:", "User Id=huddleup_app" in s)
print("Encryption enabled:", "Encrypt=True" in s)
print("Certificate trust enabled:", "TrustServerCertificate=True" in s)
'
```

After `unset`, the resolved value had length `144` and all four checks returned `True`.

Then recreate only the API:

```bash
docker compose --env-file FamilyEventPlanner.Api/.env -f FamilyEventPlanner.Api/compose.yaml up -d --force-recreate api
docker compose --env-file FamilyEventPlanner.Api/.env -f FamilyEventPlanner.Api/compose.yaml ps
```

The API became healthy. The public health check returned HTTP 200 with `{"status":"ready"}`.

## If it happens again
Check for the shell override first. If it exists and is incorrect, use `unset ConnectionStrings__DefaultConnection`, rerun the safe Compose checks, and only recreate the API after all expected settings are present.

## Lessons
- The confirmed root cause was an exported shell variable overriding `.env`, not a confirmed semicolon or quote parsing problem.
- Do not repeatedly edit `.env` when the resolved configuration is wrong; inspect precedence first.
- Do not run `source .env`. A connection string includes semicolons and is not a shell script.
- The TLS exception occurred while the connection string was incomplete. No certificate change or disabling of encryption was needed to resolve this incident.
