const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const screenSource = fs.readFileSync(path.resolve(process.cwd(), 'app/create-announcement.tsx'), 'utf8');

test('Create Announcement gives the heading full width on compact screens', () => {
  assert.match(screenSource, /const \{ width \} = useWindowDimensions\(\);/);
  assert.match(screenSource, /const isCompact = width < 440;/);
  assert.match(screenSource, /style=\{\[styles\.hero, isCompact && styles\.compactHero\]\}/);
  assert.match(screenSource, /compactHero: \{ flexDirection: 'column', alignItems: 'stretch' \}/);
  assert.match(screenSource, /style=\{\[styles\.heroCopy, isCompact && styles\.compactHeroCopy\]\}/);
  assert.match(screenSource, /compactHeroCopy: \{ flex: 0 \}/);
});

test('Create Announcement preserves the heading typography and icon on compact screens', () => {
  assert.match(screenSource, /title: \{ color: '#111A30', fontSize: 36, lineHeight: 43, fontWeight: '800' \}/);
  assert.match(screenSource, /style=\{\[styles\.heroIcon, isCompact && styles\.compactHeroIcon\]\}/);
  assert.match(screenSource, /compactHeroIcon: \{ alignSelf: 'flex-end' \}/);
});
