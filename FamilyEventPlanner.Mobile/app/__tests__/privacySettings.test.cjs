const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (file) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
const settingsSource = read('app/settings.tsx');
const layoutSource = read('app/_layout.tsx');
const screenSource = read('app/privacy.tsx');
const groupMembersSource = read('../FamilyEventPlanner.Api/Controllers/GroupMembersController.cs');
const familyGroupsSource = read('../FamilyEventPlanner.Api/Controllers/FamilyGroupsController.cs');
const eventsSource = read('../FamilyEventPlanner.Api/Controllers/EventsController.cs');

test('Settings opens the registered Privacy screen', () => {
  assert.match(settingsSource, /title: 'Privacy', icon: 'lock-outline', route: '\/privacy'/);
  assert.match(layoutSource, /Stack\.Screen name="privacy" options=\{\{ headerShown: false \}\}/);
  assert.match(screenSource, /router\.back\(\)/);
});

test('Privacy explanations describe enforced profile, group, and event access', () => {
  assert.match(groupMembersSource, /displayName = m\.User\?\.DisplayName/);
  assert.match(familyGroupsSource, /Where\(g => g\.IsSearchable/);
  assert.match(eventsSource, /Authorize\(AuthenticationSchemes = "MemberId"\)/);
  assert.match(screenSource, /Group members can see your display name in their member list/);
  assert.match(screenSource, /Only groups marked searchable appear in group search/);
  assert.match(screenSource, /Group events and member information are accessed through group membership/);
  assert.match(screenSource, /ask a group Admin about that group’s access settings/);
});

test('Privacy does not present unsupported account-level privacy controls', () => {
  assert.match(screenSource, /does not currently provide account-level privacy switches/);
  assert.match(screenSource, /Notification Preferences are managed separately/);
  assert.doesNotMatch(screenSource, /<Switch\b/);
});
