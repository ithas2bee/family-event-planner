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

test('4–6 Hours sets the Kickback expiry to six hours from now', () => {
  assert.match(
    screenSource,
    /if \(duration === '2 Hours' \|\| duration === '4–6 Hours'\) \{\s+const hours = duration === '2 Hours' \? 2 : 6;\s+return new Date\(now\.getTime\(\) \+ hours \* 60 \* 60 \* 1000\)\.toISOString\(\);/,
  );
  assert.match(screenSource, /expiresAtUtc: resolveExpiresAtUtc\(selectedDuration\)/);
});
