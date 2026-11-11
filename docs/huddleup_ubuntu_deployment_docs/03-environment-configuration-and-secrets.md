# 3. Environment Configuration and Secrets

## 3.1 API environment file

The deployment commands used this file:

``` text
FamilyEventPlanner.Api/.env
```

It is passed explicitly to Compose:

``` bash
docker compose \
  --env-file FamilyEventPlanner.Api/.env \
  -f FamilyEventPlanner.Api/compose.yaml \
  ...
```

An example template exists at:

``` text
FamilyEventPlanner.Api/.env.example
```

The server's actual `.env` is private and must not be committed or
pasted into chat, tickets, documentation, or screenshots.

A restrictive permission is recommended:

``` bash
chmod 600 FamilyEventPlanner.Api/.env
```

The mobile project also has a local file:

``` text
FamilyEventPlanner.Mobile/.env
```

That file was restored from a backup during the server update. Do not
assume the mobile `.env` and API `.env` serve the same purpose.

## 3.2 Compose variable names observed

The Compose file shown during the session referenced these settings:

  ----------------------------------------------------------------------------
  Variable                                 Purpose
  ---------------------------------------- -----------------------------------
  `MSSQL_PID`                              SQL Server edition / licensing
                                           configuration

  `MSSQL_SA_PASSWORD`                      SQL Server administrator password

  `APP_DB_PASSWORD`                        Application database login password
                                           passed to bootstrap

  `ConnectionStrings__DefaultConnection`   .NET SQL Server connection string

  `JWT_SECRET`                             JWT signing secret

  `JWT_ISSUER`                             JWT issuer; default shown as
                                           `FamilyEventPlanner.Api`

  `JWT_AUDIENCE`                           JWT audience; default shown as
                                           `FamilyEventPlanner.Mobile`

  `GOOGLE_PLACES_API_KEY`                  Google Places API key

  `RESEND_API_KEY`                         Resend email API key

  `EMAIL_FROM_ADDRESS`                     Sender address for email

  `CORS_ALLOWED_ORIGINS`                   Allowed CORS origins
  ----------------------------------------------------------------------------

The Compose file maps these into .NET configuration using
double-underscore names, for example:

``` text
Jwt__Secret
Jwt__Issuer
Jwt__Audience
GooglePlaces__ApiKey
Email__FromAddress
```

The API also receives:

``` text
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_HTTP_PORTS=8080
```

## 3.3 Database connection string

The deployment guide excerpt specified a connection string targeting:

-   Server: `sqlserver`
-   Database: `FamilyEventPlannerDb`
-   Application login: `huddleup_app`
-   Encryption: `Encrypt=True;TrustServerCertificate=True`

The actual password must be the same strong value used for
`APP_DB_PASSWORD`.

A structural example (not a real credential) is:

``` text
Server=sqlserver;Database=FamilyEventPlannerDb;User Id=huddleup_app;Password=<REDACTED>;Encrypt=True;TrustServerCertificate=True
```

Do not copy this placeholder literally. Use the exact connection-string
key expected by the Compose file:

``` text
ConnectionStrings__DefaultConnection
```

## 3.4 Password reset URL

The development URL confirmed by the session is:

``` text
https://api-dev.huddleupmobileapp.com/reset-password
```

The local Compose configuration included:

``` yaml
PasswordReset__WebUrl: https://api-dev.huddleupmobileapp.com/reset-password
```

The password reset URL must match the environment being deployed. For
production, use the production domain and verify that the domain's TLS
certificate and reverse proxy route are configured.

The successful end-to-end user test confirmed: - Forgot Password was
tapped in the Android APK. - The reset email arrived. - The email button
opened the browser reset page. - The user completed the password reset
successfully.

## 3.5 EAS environment (Android build)

The EAS build output showed that the `development` EAS environment
loaded:

-   `EXPO_PUBLIC_API_BASE_URL`
-   `GOOGLE_MAPS_ANDROID_KEY`

The build used remote Android credentials stored by Expo. The output
identified a configured remote keystore. Never download, expose, or
replace the production signing key casually.

The development EAS environment must not be confused with production.
For a production Android build, inspect the production EAS environment
and build profile, and verify the API base URL and Google Maps key are
production-appropriate.

## 3.6 Secret-handling rules

-   Keep `.env` files out of Git.
-   Do not include secret values in documentation.
-   Do not echo secret values to terminal output.
-   Redact connection strings, passwords, JWT secrets, API keys, and
    tokens before sharing logs.
-   Keep file permissions restrictive.
-   Back up secrets securely and separately from source code.
-   Do not reuse development credentials in production.
-   Rotate credentials if they are accidentally committed or disclosed.
