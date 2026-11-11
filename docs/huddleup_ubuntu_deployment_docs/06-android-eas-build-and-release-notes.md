# 6. Android EAS Build and Release Notes

## 6.1 Development Android build observed

The user ran an EAS Android build from a Windows command prompt. The
build output showed:

-   EAS environment: `development`
-   Environment variables loaded: `EXPO_PUBLIC_API_BASE_URL`,
    `GOOGLE_MAPS_ANDROID_KEY`
-   Remote Android credentials were used from the Expo server.
-   Project archive size: approximately 263 MB.
-   Archive upload completed.
-   Fingerprint computation completed.
-   Build entered the `INSTALL_DEPENDENCIES` phase and ran `npm ci`.
-   The build later completed successfully, and the resulting APK was
    installed and tested.

The user confirmed the APK worked and that the Forgot Password flow
succeeded end to end.

## 6.2 Development vs production EAS configuration

The EAS development environment is not the production environment.

Before a production Android build, verify: - The selected EAS build
profile. - The EAS environment selected by that profile. -
`EXPO_PUBLIC_API_BASE_URL` points to the production API. -
`GOOGLE_MAPS_ANDROID_KEY` is appropriate for the production Android
application and correctly restricted. - The Android application
ID/package is the intended production identifier. - The signing
credentials are the intended release credentials. - App version and
Android version code are correct. - The output is an AAB if Google Play
Console submission is intended (rather than assuming an APK is the Play
Store upload artifact).

The app configuration observed in the server output had a development
display name and Android package `com.huddleup.dev`. Do not publish a
development package identity as the production application without an
explicit product decision.

## 6.3 EAS archive size optimization backlog

The EAS build archive was approximately 263 MB. EAS suggested using a
root `.easignore` file to exclude unnecessary files.

A backlog story was created to: - Review the existing root
`.gitignore`. - Create a root `.easignore`. - Preserve all existing
ignore rules in `.easignore`. - Exclude backend source, documentation,
local backups, and generated artifacts where safe. - Keep all mobile
source, assets, configuration, and native build dependencies required by
EAS. - Inspect the archive before starting a build. - Compare archive
size with the 263 MB baseline. - Complete a successful Android
development build using the optimized archive.

Important: `.easignore` takes the place of `.gitignore` for EAS upload
filtering. Copy the existing `.gitignore` rules into `.easignore` before
adding more exclusions. Do not exclude native directories or required
app assets without verifying the build requirements.

## 6.4 Archive inspection

The suggested inspection command was:

``` bash
eas build:inspect \
  --platform android \
  --stage archive \
  --output ./eas-archive \
  --profile development
```

This is an inspection step, not a production deployment. Confirm the
installed EAS CLI version and current command syntax before relying on
it.

## 6.5 CLI warning seen

The Windows build terminal showed a warning that the installed EAS CLI
was outdated:

``` text
Proceeding with outdated version.
```

It also showed a Node warning about `--localstorage-file` being supplied
without a valid path. The build continued and succeeded. These warnings
were not investigated during the deployment session. Record them as
maintenance items, but do not change build tooling in the middle of a
release without testing.

The terminal suggested installing/updating the EAS CLI globally:

``` bash
npm install -g eas-cli
```

Before upgrading, check the currently recommended Expo CLI installation
and version guidance, and coordinate the version used by the team.
