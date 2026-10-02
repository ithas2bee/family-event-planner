const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const screenSource = fs.readFileSync(path.resolve(process.cwd(), 'app/create-kickback.tsx'), 'utf8');

test('Kickback duration choices use predefined options without Custom', () => {
  assert.match(
    screenSource,
    /durationOptions = \['2 Hours', '4–6 Hours', 'Tonight', 'Until Midnight'\] as const;/,
  );
  assert.doesNotMatch(screenSource, /Custom|customHours|customDuration/);
});

test('Kickback creation presents each form section in its own card', () => {
  assert.equal((screenSource.match(/style={styles\.card}/g) || []).length, 3);
  assert.match(screenSource, /What&apos;s the vibe\?/);
  assert.match(screenSource, /Add a note \(optional\)/);
  assert.match(screenSource, /Choose a duration for your kickback\./);
});

test('Kickback header includes a compact gathering illustration and vibe icons', () => {
  assert.match(screenSource, /gatheringIllustration: \{\s+width: 82,\s+height: 82/);
  assert.match(screenSource, /name={vibeIcons\[vibe\]}/);
  assert.match(screenSource, /const vibeIcons: Record/);
});

test('Kickback header clearly signals an immediate spontaneous hangout', () => {
  assert.match(screenSource, /<ThemedText style={styles\.nowBadgeText}>Happening now<\/ThemedText>/);
  assert.match(screenSource, /nowBadge: \{\s+alignSelf: 'flex-start'/);
  assert.doesNotMatch(screenSource, /scheduled for|pick a date|calendar/i);
});

test('4–6 Hours sets the Kickback expiry to six hours from now', () => {
  assert.match(
    screenSource,
    /if \(duration === '2 Hours' \|\| duration === '4–6 Hours'\) \{\s+const hours = duration === '2 Hours' \? 2 : 6;\s+return new Date\(now\.getTime\(\) \+ hours \* 60 \* 60 \* 1000\)\.toISOString\(\);/,
  );
  assert.match(screenSource, /expiresAtUtc: resolveExpiresAtUtc\(selectedDuration\)/);
});
