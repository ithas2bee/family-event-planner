const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (file) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
const settingsSource = read('app/settings.tsx');
const screenSource = read('app/app-information.tsx');
const detailSource = read('app/app-information/[section].tsx');
const layoutSource = read('app/_layout.tsx');

test('Settings navigates to the App Information page and registers its detail route', () => {
  assert.match(settingsSource, /title: 'App Information', icon: 'info-outline', route: '\/app-information'/);
  assert.match(layoutSource, /Stack\.Screen name="app-information" options=\{\{ headerShown: false \}\}/);
  assert.match(layoutSource, /Stack\.Screen name="app-information\/\[section\]" options=\{\{ headerShown: false \}\}/);
  assert.match(screenSource, /router\.back\(\)/);
});

test('App Information shows the project logo and version/build metadata from Expo', () => {
  assert.match(screenSource, /require\('\.\.\/assets\/huddle-up-logo\.png'\)/);
  assert.match(screenSource, /Constants\.expoConfig\?\.version/);
  assert.match(screenSource, /Constants\.nativeBuildVersion/);
  assert.match(screenSource, /Version \{version\}/);
  assert.match(screenSource, /Build number \{buildNumber\}/);
});

test('information rows open about, legal, and dependency license details without inventing legal copy', () => {
  for (const title of ['About Huddle Up', 'Terms of Service', 'Privacy Policy', 'Open Source Licenses']) {
    assert.ok(screenSource.includes(title), `Missing App Information row: ${title}`);
  }
  assert.match(detailSource, /Huddle Up brings communities together/);
  assert.match(detailSource, /Terms of Service are not available in the app yet/);
  assert.match(detailSource, /Privacy Policy is not available in the app yet/);
  assert.match(detailSource, /package-lock\.json/);
  assert.match(detailSource, /dependency\.license/);
});
