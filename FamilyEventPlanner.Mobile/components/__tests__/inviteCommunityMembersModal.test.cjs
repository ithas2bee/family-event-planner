const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const modalSource = fs.readFileSync(
  path.resolve(process.cwd(), 'components/invite-community-members-modal.tsx'),
  'utf8',
);

test('invite modal omits the decorative header and title', () => {
  assert.doesNotMatch(modalSource, /styles\.iconCircle|name="group"/);
  assert.doesNotMatch(modalSource, /Invite \{COMMUNITY_MEMBERS_LABEL\}/);
  assert.doesNotMatch(modalSource, /iconCircle:|title: \{/);
});

test('invite modal preserves its content and invitation actions', () => {
  assert.match(modalSource, /Share this code with community members so they can join your community\./);
  assert.match(modalSource, /\{inviteCode \?\? 'Unavailable'\}/);
  assert.match(modalSource, />Copy Code</);
  assert.match(modalSource, />Share Invite Code</);
  assert.match(modalSource, /Anyone with this code can join your community\./);
  assert.match(modalSource, /Share it only with people you trust\./);
  assert.match(modalSource, /Clipboard\.setStringAsync\(inviteCode\)/);
  assert.match(modalSource, /Share\.share\(\{\s*message: `Join my community using this invite code: \$\{inviteCode\}`/);
});
