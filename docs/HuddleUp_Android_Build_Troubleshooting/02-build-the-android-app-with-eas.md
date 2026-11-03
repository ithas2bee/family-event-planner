# 2. Build the Android App with EAS

## Why this path was used

The local Windows Gradle build failed while Ninja/CMake tried to create native build directories for `react-native-screens` and `react-native-worklets`. The project was then built with Expo Application Services (EAS) in the cloud.

**The EAS cloud build succeeded.** This was the working path used to produce an Android APK for installation on a physical phone.

## Install JavaScript dependencies

From the mobile project directory:

```bash
cd FamilyEventPlanner.Mobile
npm ci
```

On Ubuntu, this was needed because `node_modules` was absent and the EAS CLI could not proceed. `npm ci` installs from the lockfile. npm reported dependency vulnerabilities; `npm audit fix` was not used as an unreviewed build workaround.

## Authenticate with EAS

The Ubuntu browser-login flow stalled at “Waiting for browser login…” and was canceled. Login succeeded on the Windows development machine, so the cloud build was started there. Use the already-authenticated environment if available instead of repeating a login flow that stalls.

## Build command that succeeded

From `FamilyEventPlanner.Mobile` on Windows:

```bash
npx eas-cli build --platform android --profile development
```

The EAS build completed successfully and the APK was downloaded.

## Important distinction

After the build completed, the CLI asked whether to run the app on an Android emulator. The user wanted to install it on a physical Android phone, so the emulator option was canceled.

That emulator prompt happened **after the successful build**; it was not a Gradle build failure. For a physical phone, use the EAS build artifact/download link and install the APK.

## Avoid
- Do not assume the local Gradle error means EAS cloud build will fail.
- Do not randomly change Gradle or Android Gradle Plugin versions without diagnosing the failing task.
- Do not use Expo Go as a substitute for this app's native build; the project uses native MapLibre functionality and requires a rebuilt native app.
