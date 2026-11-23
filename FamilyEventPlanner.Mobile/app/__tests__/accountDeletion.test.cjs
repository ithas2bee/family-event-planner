const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (file) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
const settingsSource = read('app/settings.tsx');
const layoutSource = read('app/_layout.tsx');
const deletionScreen = read('app/delete-account.tsx');
const completionScreen = read('app/account-deleted.tsx');
const privacyScreen = read('app/privacy.tsx');
const preferencesService = read('services/notificationPreferencesService.ts');

test('Settings exposes Delete Account without replacing Privacy', () => {
  assert.match(settingsSource, /title: 'Delete Account', icon: 'delete-outline', route: '\/delete-account'/);
  assert.match(settingsSource, /title: 'Privacy', icon: 'lock-outline', route: '\/privacy'/);
  assert.match(layoutSource, /Stack\.Screen name="delete-account"/);
  assert.match(layoutSource, /Stack\.Screen name="privacy"/);
  assert.match(privacyScreen, /Understand what is visible and where access is managed/);
});

test('deletion screen explains actual retained and deleted data and last-admin restriction', () => {
  for (const text of [
    'Your account and profile information',
    'community memberships and role assignments',
    'event attendance',
    'poll votes',
    'Kickback responses',
    'Shared events, polls, announcements',
    'assignments, photos, and their shared files remain available',
    'Photo files are not deleted',
    'not scanned or redacted',
    'last administrator of a community',
  ]) {
    assert.ok(deletionScreen.includes(text), `Missing deletion disclosure: ${text}`);
  }
});

test('deletion requires current password and exact confirmation, and offers cancellation', () => {
  assert.match(deletionScreen, /accessibilityLabel="Current password"/);
  assert.match(deletionScreen, /secureTextEntry/);
  assert.match(deletionScreen, /accessibilityLabel="Type DELETE to confirm"/);
  assert.match(deletionScreen, /confirmation !== 'DELETE'/);
  assert.match(deletionScreen, /router\.back\(\)/);
  assert.match(deletionScreen, /onPress=\{handleDelete\}/);
  assert.match(deletionScreen, /disabled=\{isProcessing \|\| !password \|\| confirmation !== 'DELETE'\}/);
});

test('successful deletion clears user-scoped preferences and navigates to completion', () => {
  assert.match(deletionScreen, /requestDeletion: deleteCurrentAccount/);
  assert.match(deletionScreen, /clearActiveGroup/);
  assert.match(deletionScreen, /clearSession/);
  assert.match(deletionScreen, /clearPreferences: clearNotificationPreferences/);
  assert.match(deletionScreen, /router\.dismissAll\(\)/);
  assert.match(deletionScreen, /pathname: '\/account-deleted'/);
  assert.match(completionScreen, /Account deleted/);
  assert.match(completionScreen, /router\.replace\('\/auth'\)/);
  assert.match(preferencesService, /deleteItemAsync\(key\)/);
  assert.match(preferencesService, /localStorage\.removeItem\(key\)/);
  assert.match(preferencesService, /notification_preferences_\$\{userId\}/);
});
