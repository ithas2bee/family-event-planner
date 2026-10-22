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

test('sign-in and sign-up keep email/password forms without social authentication UI', () => {
  const loginSource = fs.readFileSync(path.join(appDirectory, 'login.tsx'), 'utf8');
  const createAccountSource = fs.readFileSync(path.join(appDirectory, 'create-account.tsx'), 'utf8');

  for (const source of [loginSource, createAccountSource]) {
    assert.doesNotMatch(source, /Google|Facebook|providerUnavailable|providerButton|orRow/);
    assert.match(source, /placeholder="email@example\.com"/);
    assert.match(source, /secureTextEntry=\{!showPassword\}/);
  }

  assert.match(loginSource, /<ThemedText style=\{styles\.primaryButtonText\}>Sign In<\/ThemedText>/);
  assert.match(createAccountSource, /<ThemedText style=\{styles\.primaryButtonText\}>Create Account<\/ThemedText>/);
  assert.match(createAccountSource, /placeholder="Choose a username"/);
});

test('the shared authentication surface fills the screen and keeps form padding', () => {
  assert.match(layoutSource, /<SafeAreaView style=\{styles\.safeArea\}>/);
  assert.match(layoutSource, /content: \{ flexGrow: 1 \}/);
  assert.match(layoutSource, /container: \{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 \}/);
});
