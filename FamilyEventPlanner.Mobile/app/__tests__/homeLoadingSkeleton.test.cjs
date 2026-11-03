const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileDirectory = process.cwd();
const homeSource = fs.readFileSync(path.join(mobileDirectory, 'app/family-home.tsx'), 'utf8');
const skeletonSource = fs.readFileSync(
  path.join(mobileDirectory, 'components/home-loading-skeleton.tsx'),
  'utf8'
);

test('Home shows the loading skeleton only during preview loading', () => {
  assert.match(homeSource, /useState\(Boolean\(groupId\)\)/);
  assert.match(homeSource, /if \(loadingPreviews\)\s*\{\s*return \([\s\S]*?<HomeLoadingSkeleton/);
  assert.match(homeSource, /setLoadingPreviews\(false\)/);
});

test('Home skeleton uses layout placeholders without fabricated content', () => {
  assert.match(skeletonSource, /accessibilityLabel="Loading home"/);
  assert.match(skeletonSource, /styles\.memberAvatar/);
  assert.match(skeletonSource, /styles\.profileButton/);
  assert.match(skeletonSource, /styles\.cardImage/);
  assert.doesNotMatch(skeletonSource, /<ThemedText|Loading\.\.\.|Untitled Event/);
});
