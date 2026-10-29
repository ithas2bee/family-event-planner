const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileRoot = process.cwd();
const homeSource = fs.readFileSync(path.join(mobileRoot, 'app/family-home.tsx'), 'utf8');
const tabsSource = fs.readFileSync(path.join(mobileRoot, 'app/(tabs)/(main)/_layout.tsx'), 'utf8');

test('Community Home navigates to its tab destinations without pushing Home over them', () => {
  for (const route of ['activity', 'members', 'my-groups', 'announcements', 'polls', 'kickbacks', 'events']) {
    assert.ok(
      homeSource.includes(`router.navigate('/(tabs)/(main)/${route}')`),
      `Community Home should navigate to the ${route} tab destination`,
    );
    assert.ok(
      !homeSource.includes(`router.push('/(tabs)/(main)/${route}')`),
      `Community Home should not push the ${route} tab destination`,
    );
  }
});

test('Community Home group cards open the selected group details', () => {
  assert.equal((homeSource.match(/pathname: '\/group\/\[groupId\]'/g) ?? []).length, 2);
  assert.equal((homeSource.match(/params: \{ groupId: item\.id \}/g) ?? []).length, 2);
  assert.doesNotMatch(homeSource, /pathname: '\/\(tabs\)\/family-home'/);
});

test('The Home navigation tab remains registered', () => {
  assert.match(tabsSource, /<Tabs\.Screen\s+name="family-home"[\s\S]*?title: 'Home'/);
});
