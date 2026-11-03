# 3. EAS Configuration: Profiles and Environment Variables

## `eas.json` used for the development APK

The project had the following profile structure:

```json
{
  "cli": {
    "version": ">= 24.8.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "distribution": "internal",
      "environment": "development",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "environment": "production",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

The `development` profile explicitly uses internal distribution, the EAS `development` environment, and `android.buildType: "apk"`. This produces an installable APK suitable for the development build.

Keep the development, preview, and production profiles distinct. Do not build the production profile when the intention is to test against the development API.

## API base URL in the app

`FamilyEventPlanner.Mobile/config/api.ts` reads `EXPO_PUBLIC_API_BASE_URL` or the configured `extra.apiBaseUrl`. The development build should use:

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://api-dev.huddleupmobileapp.com
```

The public API URL is configuration, not a secret. Do not put private credentials in `EXPO_PUBLIC_*` variables because those values are included in the client app.

## The EAS environment issue that was fixed

On Windows, the EAS development environment was listed with:

```bash
npx eas-cli env:list --environment development
```

It showed `GOOGLE_MAPS_ANDROID_KEY` but did not show `EXPO_PUBLIC_API_BASE_URL`.

The API URL was then created in the EAS **development** environment with plaintext visibility:

`EXPO_PUBLIC_API_BASE_URL=https://api-dev.huddleupmobileapp.com`

Plaintext visibility is appropriate for the API base URL because it is public. Do not expose API keys or other secrets in logs or screenshots.

EAS CLI syntax can change between versions; if an environment create command is needed again, check the installed CLI's help and confirm the target environment before running it.

## App configuration details to preserve

- Android package ID: `com.huddleup.familyeventplanner`
- App scheme: `familyeventplannermobile`
- `app.config.js` uses the `EAS_BUILD_PROFILE` to conditionally configure cleartext traffic for development. Do not broaden cleartext HTTP access to production.
- A Google Places API key was tried earlier and did not work; the user did not want it used. Do not substitute it for the configured Maps key.

## Before rebuilding

1. Check `eas.json` and confirm the intended profile.
2. Confirm `EXPO_PUBLIC_API_BASE_URL` exists in the matching EAS environment.
3. Ensure the API URL is reachable from the physical device.
4. Confirm EAS is logged into the intended account.
5. Run the EAS build command with the correct profile.
