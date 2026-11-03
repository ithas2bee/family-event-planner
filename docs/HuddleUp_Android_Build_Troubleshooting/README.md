# Huddle Up Android Build Troubleshooting

This archive focuses only on the Android build problems encountered while preparing Huddle Up for testing: the local Gradle/CMake failure, the decision to use an EAS cloud APK build, and the EAS profile/environment setup.

## Files
- `01-local-gradle-cmake-failure.md` — the actual Windows Gradle error from `react-native-screens` and `react-native-worklets`.
- `02-build-the-android-app-with-eas.md` — the build path that succeeded and why it was used.
- `03-eas-json-and-build-environment.md` — the actual profile and environment-variable steps.
- `04-installing-the-apk-on-a-physical-phone.md` — what happened after the successful build and how to distinguish build success from installation/link issues.
- `05-repeatable-checklist.md` — short checklist for the next development build.

## Scope and accuracy
The Gradle log was recovered from the uploaded `type gradle.txt`. It shows Ninja/CMake failing to create generated build directories under `node_modules` for `react-native-screens` and `react-native-worklets`. The available record confirms that the local Gradle build failed and the EAS cloud development APK build later succeeded. It does **not** preserve a confirmed local Gradle command or a confirmed local Gradle-specific fix. This guide therefore records the actual failure and the successful workaround, without claiming that a guessed cleanup or version change was the historical fix.
