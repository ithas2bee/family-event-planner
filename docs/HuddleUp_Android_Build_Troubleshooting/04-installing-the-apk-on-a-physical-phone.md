# 4. Installing the APK on a Physical Android Phone

## What happened
The EAS development build completed successfully and the APK was downloaded. The CLI then asked whether to run it on an Android emulator. The user wanted a physical Android phone and canceled the emulator prompt.

The build link opened on the phone, but the page reported an invalid email/password. This did not prove the APK build had failed: the cloud build had already succeeded.

## Correct path
1. Open the EAS build details page on a computer where the correct Expo account is authenticated.
2. Find the actual APK artifact/download action for that successful build.
3. Open the artifact/download link on the phone or transfer the APK to the phone.
4. Install the APK. If Android blocks the install, review the device's “install unknown apps” permission for the browser or file manager used to open the APK.
5. Launch the installed app and test the development API.

Do not confuse an Expo account login page with the APK artifact itself. If a link requests account credentials and fails, return to the build page and locate the artifact download rather than rebuilding immediately.

## If the app cannot reach the API
The intended development URL is:

`https://api-dev.huddleupmobileapp.com`

The API health check was confirmed to return HTTP 200 with `{"status":"ready"}`. If the app still cannot connect, check the API URL embedded in the build and the app's runtime logs rather than assuming the Gradle build is at fault.
