# 6. Quick Reference

## Known-good deployment
- API URL: `https://api-dev.huddleupmobileapp.com`
- Health endpoint: `/health/ready`
- Expected response: HTTP 200, `{"status":"ready"}`
- API container: `huddleup-api-1`
- SQL container: `huddleup-sqlserver-1`
- Repository root: `~/Development/Sites/HuddleUp/family-event-planner`
- Compose file: `FamilyEventPlanner.Api/compose.yaml`

## Check API and SQL health
```bash
cd ~/Development/Sites/HuddleUp/family-event-planner
docker compose --env-file FamilyEventPlanner.Api/.env -f FamilyEventPlanner.Api/compose.yaml ps
curl -i https://api-dev.huddleupmobileapp.com/health/ready
```

## Recent API logs
```bash
cd ~/Development/Sites/HuddleUp/family-event-planner
docker compose --env-file FamilyEventPlanner.Api/.env -f FamilyEventPlanner.Api/compose.yaml logs --tail=80 api
```

## Check for the known shell override
```bash
cd ~/Development/Sites/HuddleUp/family-event-planner
printenv ConnectionStrings__DefaultConnection >/dev/null \\
  && echo "Shell override exists" \\
  || echo "No shell override"
```

If incorrect:
```bash
cd ~/Development/Sites/HuddleUp/family-event-planner
unset ConnectionStrings__DefaultConnection
```

Then run the safe Compose configuration check in `02-docker-compose-connection-string.md`.

## Recreate only the API after verifying config
```bash
cd ~/Development/Sites/HuddleUp/family-event-planner
docker compose --env-file FamilyEventPlanner.Api/.env -f FamilyEventPlanner.Api/compose.yaml up -d --force-recreate api
docker compose --env-file FamilyEventPlanner.Api/.env -f FamilyEventPlanner.Api/compose.yaml ps
```

## Android EAS development APK
From the repository root in an authenticated environment:

```bash
cd FamilyEventPlanner.Mobile
npm ci
npx eas-cli build --platform android --profile development
```

The EAS `development` profile should use internal distribution and `android.buildType: "apk"`. Confirm `EXPO_PUBLIC_API_BASE_URL` is set in the EAS development environment.

## Confirmed facts vs missing historical detail
Confirmed:
- Public health endpoint returned HTTP 200 before the database restore.
- Database backup restored successfully.
- Restored database had 18 tables, including `Users`.
- API failed because the resolved connection string was truncated.
- An exported shell variable overrode `.env`.
- Unsetting it restored the full Compose value.
- Recreating the API made it healthy and public health returned HTTP 200.
- An EAS Android development APK build succeeded.

Not preserved:
- Exact original Gradle error text and the specific fix used for each Gradle issue.
- Every intermediate EAS configuration error and its exact output.

Capture exact future error text rather than assuming the same cause.
