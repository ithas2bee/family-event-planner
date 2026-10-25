const assert = require('node:assert/strict');
const test = require('node:test');
const appConfig = require('./app.json');
const easConfig = require('./eas.json');

test('forces the app to use the light user interface style', () => {
  assert.equal(appConfig.expo.userInterfaceStyle, 'light');
});

test('configures Android preview builds to produce an installable APK', () => {
  assert.equal(easConfig.build.preview.android.buildType, 'apk');
});
