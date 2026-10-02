const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const profileSource = fs.readFileSync(path.resolve(process.cwd(), 'app/profile.tsx'), 'utf8');
const membersSource = fs.readFileSync(
  path.resolve(process.cwd(), 'components/members-screen.tsx'),
  'utf8',
);

function getAvatarTextMetrics(source) {
  const match = source.match(/avatarText:\s*\{\s*fontSize:\s*(\d+),\s*lineHeight:\s*(\d+)/);
  assert.ok(match, 'avatar text should define a line height for its custom font size');
  return { fontSize: Number(match[1]), lineHeight: Number(match[2]) };
}

test('profile avatar initials have enough line height for their font size', () => {
  const { fontSize, lineHeight } = getAvatarTextMetrics(profileSource);
  assert.ok(lineHeight > fontSize);
});

test('family member avatar initials have enough line height for their font size', () => {
  const { fontSize, lineHeight } = getAvatarTextMetrics(membersSource);
  assert.ok(lineHeight > fontSize);
});
