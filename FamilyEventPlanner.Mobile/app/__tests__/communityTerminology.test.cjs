const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileRoot = process.cwd();
const source = (relativePath) => fs.readFileSync(path.join(mobileRoot, relativePath), 'utf8');
const terminology = source('constants/communityTerminology.ts');
const genericScreens = [
  'components/my-groups-screen.tsx',
  'components/all-groups-screen.tsx',
  'components/create-hub.tsx',
  'components/community-members-section.tsx',
  'components/invite-community-members-modal.tsx',
  'components/members-screen.tsx',
  'app/family-home.tsx',
  'app/events.tsx',
  'app/event/[eventId].tsx',
  'app/activity.tsx',
  'app/announcements.tsx',
  'app/create-account.tsx',
  'app/create-announcement.tsx',
  'app/create-event.tsx',
  'app/create-kickback.tsx',
  'app/create-poll.tsx',
  'app/polls.tsx',
  'app/profile.tsx',
  'app/settings.tsx',
  'app/group-required.tsx',
];

test('Generic community labels are centralized and major mobile screens avoid Family assumptions', () => {
  assert.match(terminology, /COMMUNITY_LABEL = 'Community'/);
  assert.match(terminology, /COMMUNITIES_LABEL = 'Communities'/);
  assert.match(terminology, /COMMUNITY_MEMBERS_LABEL = 'Community Members'/);

  for (const screen of genericScreens) {
    assert.doesNotMatch(source(screen), /Family(?: group| event| member| home)|(?:your|the) family|families/i, screen);
  }
});

test('Generic group surfaces use Community while Family remains a selectable Community Type', () => {
  assert.match(source('components/my-groups-screen.tsx'), /COMMUNITY_LABEL/);
  assert.match(source('components/my-groups-screen.tsx'), /Your \{COMMUNITIES_LABEL\}/);
  assert.match(source('app/events.tsx'), /Community Events/);
  assert.match(source('components/members-screen.tsx'), /Community Members/);

  const creationSource = source('app/create-group.tsx');
  assert.match(creationSource, /label: 'Family'/);
  for (const communityType of ['Friends', 'Sports & Fitness', 'School & Education', 'Work & Professional', 'Neighborhood & Local', 'Hobbies & Interests', 'Other']) {
    assert.ok(creationSource.includes(`label: '${communityType}'`), `${communityType} remains available`);
  }
  assert.match(creationSource, /groupType: selectedType/);
});
