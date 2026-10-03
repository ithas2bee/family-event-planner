const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const screenSource = fs.readFileSync(path.resolve(process.cwd(), 'app/create-group.tsx'), 'utf8');
const apiSource = fs.readFileSync(
  path.resolve(process.cwd(), '../FamilyEventPlanner.Api/Controllers/FamilyGroupsController.cs'),
  'utf8',
);
const layoutSource = fs.readFileSync(path.resolve(process.cwd(), 'app/_layout.tsx'), 'utf8');

test('Create Group offers all supported community types with a selectable type step', () => {
  const typeList = screenSource.match(/const communityTypes = \[([\s\S]*?)\] as const;/)?.[1] ?? '';
  const typeLabels = [...typeList.matchAll(/\{ label: '([^']+)'/g)].map((match) => match[1]);

  assert.deepEqual(typeLabels, [
    'Family',
    'Friends',
    'Couples',
    'Parents & Kids',
    'Sports & Fitness',
    'School & Education',
    'Work & Professional',
    'Neighborhood & Local',
    'Hobbies & Interests',
    'Faith & Spiritual',
    'Clubs & Organizations',
    'Travel',
    'Alumni',
    'Support & Care',
    'Events & Social',
    'Other',
  ]);
  assert.match(screenSource, /accessibilityRole="radio"/);
  assert.match(screenSource, /accessibilityState=\{\{ checked: selected \}\}/);
  assert.match(layoutSource, /Stack\.Screen name="create-group" options=\{\{ headerShown: false \}\}/);
});

test('Group name is required and description is optional in the create request', () => {
  assert.match(screenSource, /groupName\.trim\(\)\.length > 0/);
  assert.match(screenSource, /disabled={!canContinue \|\| loading}/);
  assert.match(screenSource, /description: description\.trim\(\) \|\| null/);
  assert.match(screenSource, /groupType: selectedType/);
});

test('Create Group explains and enforces private defaults without privacy choices', () => {
  assert.match(screenSource, /Invite Only \(Not Searchable\)/);
  assert.match(screenSource, /won&apos;t appear in group search results/);
  assert.match(screenSource, /only join with an\s+invitation/);
  assert.match(screenSource, /Admin can change discoverability and join settings later in Group Settings/);
  assert.doesNotMatch(screenSource, /<Switch|setIsInviteOnly|setIsSearchable/);
  assert.match(apiSource, /IsInviteOnly = true/);
  assert.match(apiSource, /IsSearchable = false/);
});
