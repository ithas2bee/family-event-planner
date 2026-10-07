const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const appJson = require('./app.json');
const expoConfig = appJson.expo;
const splashPlugin = expoConfig.plugins.find((entry) => Array.isArray(entry) && entry[0] === 'expo-splash-screen');

const requiredAssetPaths = [
  './assets/huddle-up-logo.png',
  './assets/images/huddle-up-logo.png',
  './assets/images/icon.png',
  './assets/images/splash-icon.png',
  './assets/images/android-icon-background.png',
  './assets/images/android-icon-foreground.png',
  './assets/images/android-icon-monochrome.png',
];

test('uses Huddle Up branding for launch and app icons', () => {
  assert.equal(expoConfig.icon, './assets/images/icon.png');
  assert.equal(expoConfig.android.adaptiveIcon.foregroundImage, './assets/images/android-icon-foreground.png');
  assert.equal(expoConfig.android.adaptiveIcon.backgroundImage, './assets/images/android-icon-background.png');
  assert.equal(expoConfig.android.adaptiveIcon.monochromeImage, './assets/images/android-icon-monochrome.png');
  assert.ok(splashPlugin);
  assert.equal(splashPlugin[1].image, './assets/images/android-icon-foreground.png');
  assert.equal(splashPlugin[1].imageWidth, 200);
  assert.equal(splashPlugin[1].resizeMode, 'contain');
  assert.equal(splashPlugin[1].backgroundColor, '#F4F5F7');

  for (const assetPath of requiredAssetPaths) {
    assert.ok(fs.existsSync(path.resolve(__dirname, assetPath)), `Missing asset: ${assetPath}`);
  }
});
