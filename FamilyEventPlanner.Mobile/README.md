# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Android EAS preview builds

The `preview` profile explicitly requests an Android APK for device installation.

The SDK 58 Gradle failure has not been diagnosed from the available evidence. Expo
dependency validation reported the installed versions as current using its local
SDK dependency map because network access was disabled. Android prebuild completed,
but the local Gradle attempt stopped while resolving
`org.gradle.toolchains.foojay-resolver-convention:1.0.0` from Gradle plugin
repositories, before compiling the app. That sandbox networking failure does not
identify the cause of the EAS builds' Gradle failure.

The referenced EAS build details could not be retrieved because this environment
has no authenticated Expo session and cannot reach the Expo build API. Retrieve a
failed build's full Gradle logs with an authenticated `eas build:view <build-id>`
before making further Gradle or dependency changes or starting another cloud build.
