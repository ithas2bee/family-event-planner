# 5. Configuration and Secrets Checklist

## Ubuntu `.env`
The API `.env` contains settings such as `MSSQL_PID`, `MSSQL_SA_PASSWORD`, `APP_DB_PASSWORD`, `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `ConnectionStrings__DefaultConnection`, and optional email provider settings.

Keep `.env` private and untracked. Use `.env.example` with placeholders only.

## Docker Compose precedence
An exported shell variable can override a value from `.env`. In this incident, the shell had `ConnectionStrings__DefaultConnection` set to only `Server=sqlserver,1433`, overriding the complete value in `.env`.

Safe existence check:

```bash
printenv ConnectionStrings__DefaultConnection >/dev/null \\
  && echo "Shell override exists" \\
  || echo "No shell override"
```

Remove an incorrect override from the current shell:

```bash
unset ConnectionStrings__DefaultConnection
```

From the repository root, check the resolved configuration without printing it:

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

Expected for the known configuration: length `144`; all four checks `True`.

## Do not source `.env`
Do not run `source .env`. It is Compose configuration, not shell syntax. Connection strings contain semicolons and may be misinterpreted by a shell.

## Secrets to redact
- SQL Server SA password
- Application database password
- JWT secret
- Resend API key
- Google Maps/API keys
- EAS access tokens and signing credentials

Prefer commands that report booleans or lengths instead of printing secret-bearing values.

## Mobile configuration
- Keep `FamilyEventPlanner.Mobile/.env` local and untracked.
- Development API base URL: `https://api-dev.huddleupmobileapp.com`.
- Set `EXPO_PUBLIC_API_BASE_URL` in EAS's `development` environment for cloud builds.
- Do not put private server secrets in `EXPO_PUBLIC_*` variables; those are exposed to the client app.
