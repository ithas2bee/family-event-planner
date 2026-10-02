const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const appDirectory = path.resolve(__dirname, '..');
const layoutSource = fs.readFileSync(
  path.resolve(appDirectory, '../components/auth-screen-layout.tsx'),
  'utf8',
);

test('Sign In and Create Account use the shared authentication layout', () => {
  for (const screen of ['login.tsx', 'create-account.tsx']) {
    const source = fs.readFileSync(path.join(appDirectory, screen), 'utf8');
    assert.match(source, /import \{ AuthScreenLayout \} from '@\/components\/auth-screen-layout'/);
    assert.match(source, /<AuthScreenLayout>[\s\S]*<\/AuthScreenLayout>/);
  }
});

test('the shared authentication surface fills the screen and keeps form padding', () => {
  assert.match(layoutSource, /<SafeAreaView style=\{styles\.safeArea\}>/);
  assert.match(layoutSource, /content: \{ flexGrow: 1 \}/);
  assert.match(layoutSource, /container: \{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 \}/);
});
