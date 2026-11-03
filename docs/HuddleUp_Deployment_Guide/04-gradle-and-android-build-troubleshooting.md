# 4. Gradle and Android Build Troubleshooting

## Accuracy note
Gradle errors occurred during Android build work, and the app ultimately required a specific EAS development-build process. The exact Gradle error text and the exact fix used for those errors were not preserved in the available conversation history. This guide provides a repeatable diagnostic process and does not claim a specific historical fix.

## First distinguish the build path
1. **Local Android build:** Gradle runs on the developer's machine and depends on the local Java/Android SDK setup and network.
2. **EAS cloud build:** Expo's build environment runs the Android build. This was the successful path used for the Huddle Up development APK.

If local Gradle setup is troublesome and the project is configured for EAS, use the configured EAS build path rather than making speculative Gradle changes.

## Capture the real error
Do not diagnose from the final line alone. Capture the first meaningful error and the task that failed.

From the mobile project directory, run:

```bash
cd FamilyEventPlanner.Mobile
npx expo-doctor
```

If the project has an `android/` directory and Gradle wrapper, run the wrapper's `--stacktrace` option against the failing task. Use the wrapper in the project rather than installing an arbitrary global Gradle version.

```bash
cd FamilyEventPlanner.Mobile/android
./gradlew <failing-task> --stacktrace
```

Replace `<failing-task>` with the task named in the actual error. On Windows, use `gradlew.bat`.

## Categories to identify before editing
- **Java/JDK mismatch:** inspect the project's required JDK and the Java version used by the build.
- **Missing Android SDK/build tools:** verify required SDK packages are installed.
- **Dependency/network errors:** identify the repository and artifact that failed; a download failure may be transient.
- **Gradle/Android Gradle Plugin incompatibility:** compare declared versions with the Expo SDK compatibility guidance before changing versions.
- **Native module/config-plugin failure:** capture the plugin name and first error from configuration/prebuild.
- **Out of memory or daemon crash:** use the actual JVM/Gradle error to decide whether memory configuration is relevant.
- **Signing/distribution issue:** distinguish signing failures from compilation failures and from an APK installation/login issue.

Do not randomly upgrade Gradle, Android Gradle Plugin, Expo, React Native, or packages. Version changes can introduce more incompatibilities.

## Reproducible dependency install
```bash
cd FamilyEventPlanner.Mobile
npm ci
```

Keep the lockfile. Do not delete it or use `npm install` as a reflexive fix for a Gradle error.

## EAS cloud build path that succeeded
```bash
npx eas-cli build --platform android --profile development
```

Before running, ensure dependencies are installed, EAS CLI is authenticated, the EAS development environment includes `EXPO_PUBLIC_API_BASE_URL`, and `eas.json` contains the intended development APK profile.

## Information to collect when a Gradle failure returns
1. Exact command used.
2. First meaningful error and failed task.
3. Output of `java -version`.
4. Expo SDK and React Native versions from `package.json`.
5. Relevant Gradle and Android Gradle Plugin versions.
6. Whether the failure occurred locally or in EAS cloud build.

Never include tokens, passwords, signing keys, keystores, or `.env` contents.

## Avoid risky shortcuts
- Do not randomly edit Gradle versions.
- Do not remove native directories or regenerate them without confirming the project workflow.
- Do not delete signing files or credentials.
- Do not disable TLS/certificate checks to make dependency downloads work.
- Do not run `npm audit fix --force` as a build fix.
- Do not assume an EAS login-page problem means the cloud build failed.
