# 5. Configuration and Secrets Checklist

Run repository-relative commands from the repository root (`~/Development/Sites/HuddleUp/family-event-planner`).

## Ubuntu `.env`
The API `.env` contains settings such as `MSSQL_PID`, `MSSQL_SA_PASSWORD`, `APP_DB_PASSWORD`, `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `ConnectionStrings__DefaultConnection`, and optional email provider settings.

Keep `.env` private and untracked. Use `.env.example` with placeholders only.

## Docker Compose precedence
An exported shell variable can override `.env`. The confirmed incident and safe resolved-configuration check are documented in `02-docker-compose-connection-string.md`; use that single procedure rather than copying or printing the resolved connection string here.

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
