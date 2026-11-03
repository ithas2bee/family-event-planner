const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (file) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
const settingsSource = read('app/settings.tsx');
const layoutSource = read('app/_layout.tsx');
const screenSource = read('app/notification-preferences.tsx');
const activitySource = read('app/activity.tsx');
const serviceSource = read('services/notificationPreferencesService.ts');

test('Settings opens the registered Notification Preferences screen', () => {
  assert.match(
    settingsSource,
    /title:\s*'Notification Preferences'[\s\S]*?route:\s*'\/notification-preferences'/,
  );
  assert.match(layoutSource, /Stack\.Screen name="notification-preferences" options=\{\{ headerShown: false \}\}/);
  assert.match(screenSource, /router\.back\(\)/);
});

test('Preferences cover only categories supported by the activity feed', () => {
  for (const category of ['Events', 'Kickbacks', 'Groups', 'Polls', 'Announcements']) {
    assert.ok(serviceSource.includes(`key: '${category}'`), `Missing ${category} preference`);
  }
  assert.match(screenSource, /NOTIFICATION_PREFERENCE_CATEGORIES\.map/);

  for (const activityType of ['Event', 'Kickback', 'MemberJoined', 'GroupCreated', 'Poll', 'Announcement']) {
    assert.ok(
      serviceSource.includes(`startsWith('${activityType}')`) ||
        serviceSource.includes(`=== '${activityType}'`),
      `Missing ${activityType} activity mapping`,
    );
  }

  assert.match(activitySource, /getNotificationPreferenceCategory\(item\.activityType\)/);
  assert.match(activitySource, /preferences\?\.\[category\] === false/);
});

test('Preferences persist under the signed-in user and switches save changes', () => {
  assert.match(serviceSource, /getStorageKey\(session\.userId\)/);
  assert.match(serviceSource, /SecureStore\.setItemAsync\(key, value\)/);
  assert.match(serviceSource, /localStorage\.setItem\(key, value\)/);
  assert.match(screenSource, /saveNotificationPreferences\(updatedPreferences\)/);
  assert.match(screenSource, /accessibilityState=\{\{/);
});
