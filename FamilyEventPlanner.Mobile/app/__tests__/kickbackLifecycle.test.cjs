const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const kickbacksSource = fs.readFileSync(path.resolve(process.cwd(), 'app/kickbacks.tsx'), 'utf8');
const detailsSource = fs.readFileSync(path.resolve(process.cwd(), 'app/kickback/[kickbackId].tsx'), 'utf8');
const serviceSource = fs.readFileSync(path.resolve(process.cwd(), 'services/kickbackService.ts'), 'utf8');
const createSource = fs.readFileSync(path.resolve(process.cwd(), 'app/create-kickback.tsx'), 'utf8');
const layoutSource = fs.readFileSync(path.resolve(process.cwd(), 'app/_layout.tsx'), 'utf8');

test('an unexpired Kickback is always shown as happening now, regardless of its expiry date', () => {
  assert.match(
    kickbacksSource,
    /if \(expiry\.getTime\(\) <= now\.getTime\(\)\) return 'Past';\s+return 'Happening Now';/,
  );
  assert.doesNotMatch(kickbacksSource, /return 'Tomorrow'|In \$\{dayDifference\} Days/);
});

test('Kickbacks open a detail route with an Edit action for the creator', () => {
  assert.match(kickbacksSource, /pathname: '\/kickback\/\[kickbackId\]'/);
  assert.match(detailsSource, /accessibilityLabel="Edit Kickback"/);
  assert.match(detailsSource, /kickback\.createdByMemberId === memberId/);
  assert.match(layoutSource, /name="kickback\/\[kickbackId\]"/);
});

test('editing updates the existing Kickback through PUT and preserves expiry unless a duration is selected', () => {
  assert.match(serviceSource, /fetch\(`\$\{API_BASE_URL\}\/api\/kickbacks\/\$\{kickbackId\}`,[\s\S]*?method: 'PUT'/);
  assert.match(createSource, /await updateKickback\(kickbackIdValue, updatedFields\)/);
  assert.match(createSource, /selectedDuration !== null[\s\S]*?existingKickback\?\.expiresAtUtc/);
});
