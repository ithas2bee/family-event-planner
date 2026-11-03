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

## Android native build troubleshooting

Run `npm run android:release:clean` for a clean local Android release build. It
deletes and regenerates the ignored `android/` project before invoking the Gradle
wrapper for `assembleRelease`, so generated Gradle, autolinking, CMake, and Ninja
files are rebuilt with the current checkout path. This does not require a device
or emulator.

The Android native project is generated and ignored by Git. CMake caches record
their source and build directories, so a clean prebuild can remove stale paths
after moving a local checkout. If Ninja instead fails on an excessively long
Windows path, a clean prebuild alone may not help. The
[Reanimated Windows build guide](https://github.com/software-mansion/react-native-reanimated/blob/main/docs/docs-reanimated/docs/guides/building-for-android-on-windows.md)
lists `mkdir(...): No such file or directory` among Windows native-build symptoms
and recommends CMake 3.22.1+, Ninja 1.12.0+, a short project path, and Windows
long-path support. Those Windows-specific settings do not apply to EAS's remote
Linux Android workers.

The reported `C:/Github/Active-Work/...` path is not hard-coded in this repository.
Finding it in generated Windows `.cxx` files does not establish why the separate
EAS Gradle build failed. The `preview` EAS profile requests an installable Android
APK, but the cause of the reported cloud build failure remains unconfirmed without
its task-level diagnostics.
