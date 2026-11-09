# 3. Android Development Build with Expo EAS

## Goal
Build an Android development APK that points to `https://api-dev.huddleupmobileapp.com`.

## Relevant files
Project folder: `FamilyEventPlanner.Mobile`
- `config/api.ts`
- `.env` (local setting; should not be committed)
- `app.config.js`
- `eas.json`

## API base URL
The mobile app reads `EXPO_PUBLIC_API_BASE_URL`, falling back to Expo config `extra.apiBaseUrl`. The intended development URL is:

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://api-dev.huddleupmobileapp.com
```

Use the development URL for the development build; keep production configuration separate.

## EAS build profile
The project had this profile structure:

```json
{
  "cli": {"version": ">= 24.8.0", "appVersionSource": "remote"},
  "build": {
    "development": {
      "distribution": "internal",
      "environment": "development",
      "android": {"buildType": "apk"}
    },
    "preview": {
      "distribution": "internal",
      "android": {"buildType": "apk"}
    },
    "production": {
      "environment": "production",
      "autoIncrement": true
    }
  },
  "submit": {"production": {}}
}
```

The development profile uses internal distribution and an APK, suitable for installing on an Android phone. Compare with the repository's current version before replacing any file.

## Install dependencies
From the repository root, change to the mobile project directory. On Ubuntu, EAS initially could not proceed because `node_modules` was absent. Dependencies were installed with:

```bash
cd FamilyEventPlanner.Mobile
npm ci
```

`npm ci` installs versions from the lockfile. npm reported vulnerabilities in the dependency tree. Do not run `npm audit fix` blindly during deployment troubleshooting; review findings separately.

## EAS account and environment
EAS login on Ubuntu stalled at the browser-login wait and was canceled. On Windows, EAS login succeeded for the Expo account.

The EAS development environment initially had `GOOGLE_MAPS_ANDROID_KEY` but lacked `EXPO_PUBLIC_API_BASE_URL`. The development environment variable was then created with this value:

`EXPO_PUBLIC_API_BASE_URL=https://api-dev.huddleupmobileapp.com`

The URL is not a secret. Do not paste secret values from EAS output.

To list development environment variables, confirm the installed CLI syntax and use:

```bash
cd FamilyEventPlanner.Mobile
npx eas-cli env:list --environment development
```

## Successful build command
From the repository root on the authenticated Windows machine:

```bash
cd FamilyEventPlanner.Mobile
npx eas-cli build --platform android --profile development
```

The cloud build succeeded and the APK was downloaded. The CLI then asked whether to run it on an Android emulator. The user wanted a physical Android phone, so the emulator option was canceled.

## Install on a physical phone
Open the actual EAS build artifact/download link on the Android phone and install the APK. If a page asks for an Expo account login and reports invalid credentials, do not assume the APK build failed—the build had already succeeded. Make sure the link is to the build artifact rather than an account-login page.

If Android blocks installation, review the device's install-unknown-apps prompt for the browser or file manager used to open the APK. Only install an APK from the expected EAS build.

## Google Maps key
The project config reads a key through `GOOGLE_MAPS_IOS_KEY` for the configured plugin path, while the EAS environment had a `GOOGLE_MAPS_ANDROID_KEY`. Verify current platform-specific key wiring before changing it. A Google Places API key had previously been tried and did not work; the user did not want that key used. Do not substitute it.

## Before rebuilding
1. Confirm the development API returns HTTP 200 at `/health/ready`.
2. Confirm `EXPO_PUBLIC_API_BASE_URL` is set in the EAS development environment.
3. Confirm the `development` profile specifies `android.buildType: "apk"`.
4. Confirm the correct Expo account is authenticated.
5. Run the development build command.
6. Install the APK on the phone and test against the development API.
