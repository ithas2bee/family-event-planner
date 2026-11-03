# 5. Repeatable Android Development Build Checklist

## Before building
- [ ] Work in `FamilyEventPlanner.Mobile`.
- [ ] Run `npm ci` if dependencies need to be installed from the lockfile.
- [ ] Check `eas.json`; use the `development` profile for the development API.
- [ ] Confirm the profile sets `distribution: "internal"`, `environment: "development"`, and `android.buildType: "apk"`.
- [ ] Confirm EAS development environment contains `EXPO_PUBLIC_API_BASE_URL=https://api-dev.huddleupmobileapp.com`.
- [ ] Confirm the development API health endpoint returns HTTP 200.
- [ ] Confirm EAS is authenticated on the machine where the build will run.

## Build
```bash
npx eas-cli build --platform android --profile development
```

Wait for EAS to report success and provide the build artifact. The successful build in the documented workflow produced an APK.

## Install
- [ ] Use the APK artifact/download link, not an Expo login page.
- [ ] Install on the physical Android phone.
- [ ] Open the app and test a real API-backed flow.

## If local Gradle fails
The previously captured local failure was a Windows CMake/Ninja directory-creation error in `react-native-screens` and `react-native-worklets`. Preserve the full error and failed task. Do not treat Gradle deprecation warnings as the cause, and do not change toolchain versions without evidence. The EAS cloud build path succeeded.

## Do not
- [ ] Do not randomly upgrade Gradle, Kotlin, AGP, Expo, or React Native.
- [ ] Do not run `npm audit fix --force` as a build workaround.
- [ ] Do not expose `.env`, EAS tokens, API keys, signing credentials, or passwords.
- [ ] Do not assume a login-page issue means the APK build failed.
