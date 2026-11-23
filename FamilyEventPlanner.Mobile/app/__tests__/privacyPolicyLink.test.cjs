const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (file) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
const privacyPolicySource = read('constants/privacyPolicy.ts');
const appInformationSource = read('app/app-information/[section].tsx');
const authSource = read('app/auth.tsx');
const authLayoutSource = read('components/auth-screen-layout.tsx');
const externalLinkSource = read('components/external-link.tsx');
const settingsSource = read('app/settings.tsx');
const privacyScreenSource = read('app/privacy.tsx');

test('the legal privacy policy URL is centralized and linked from App Information', () => {
  assert.match(privacyPolicySource, /^export const PRIVACY_POLICY_URL = 'https:\/\/[^']+\/privacy';\s*$/);
  assert.match(appInformationSource, /ExternalLink href=\{PRIVACY_POLICY_URL\}/);
  assert.match(appInformationSource, /Open Privacy Policy/);
});

test('public authentication screens expose the policy without signing in', () => {
  assert.match(authSource, /ExternalLink href=\{PRIVACY_POLICY_URL\}/);
  assert.match(authLayoutSource, /ExternalLink href=\{PRIVACY_POLICY_URL\}/);
  assert.match(authLayoutSource, /Privacy Policy/);
});

test('native links use the in-app browser and report browser launch failures', () => {
  assert.match(externalLinkSource, /openBrowserAsync\(href/);
  assert.match(externalLinkSource, /catch \{/);
  assert.match(externalLinkSource, /Unable to open link/);
});

test('the existing Settings Privacy information page remains separate', () => {
  assert.match(settingsSource, /title: 'Privacy', icon: 'lock-outline', route: '\/privacy'/);
  assert.match(privacyScreenSource, /Understand what is visible and where access is managed/);
});
