const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileRoot = process.cwd();
const screenSource = fs.readFileSync(path.join(mobileRoot, 'app/join-group.tsx'), 'utf8');
const serviceSource = fs.readFileSync(path.join(mobileRoot, 'services/groupSearchService.ts'), 'utf8');

test('Join a Group searches names and presents public access information', () => {
  assert.match(screenSource, /Search by group name/);
  assert.match(screenSource, /onSubmitEditing=\{\(\) => void runSearch\(searchTerm, session\)\}/);
  assert.match(screenSource, /Community type · \{group\.groupType\}/);
  assert.match(screenSource, /Invite Only • Invitation Required/);
  assert.match(screenSource, /Community • Request to Join/);
  assert.match(screenSource, /No groups found/);
  assert.match(screenSource, /Searching groups/);
});

test('Selecting a result only reveals its public information without joining or switching groups', () => {
  const selectHandler = screenSource.match(/onPress=\{\(\) => setSelectedGroupId\([^}]+\)\}/)?.[0] ?? '';

  assert.ok(selectHandler);
  assert.doesNotMatch(selectHandler, /setActiveGroup|joinFamilyGroup|router\./);
  assert.match(screenSource, /Community type<\/Text>/);
  assert.match(screenSource, /<Text style=\{styles\.selectedInfoLabel\}>Access<\/Text>/);
});

test('Group search requests carry account or member authentication and encode the search term', () => {
  assert.match(serviceSource, /\/api\/familygroups\/search\?query=\$\{encodeURIComponent\(query\)\}/);
  assert.match(serviceSource, /Authorization:/);
  assert.match(serviceSource, /'X-Member-Id': memberId/);
  assert.match(serviceSource, /if \(!authToken && !memberId\)/);
});

test('Joining with an existing invite code remains available separately from search results', () => {
  assert.match(screenSource, /joinFamilyGroup\(\{/);
  assert.match(screenSource, /Join with Code/);
});
