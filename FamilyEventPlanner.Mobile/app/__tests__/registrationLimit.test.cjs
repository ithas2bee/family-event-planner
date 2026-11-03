const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileDirectory = process.cwd();
const apiDirectory = path.resolve(mobileDirectory, '../FamilyEventPlanner.Api');
const authControllerSource = fs.readFileSync(
  path.join(apiDirectory, 'Controllers/AuthController.cs'),
  'utf8',
);
const createAccountSource = fs.readFileSync(path.join(mobileDirectory, 'app/create-account.tsx'), 'utf8');
const userServiceSource = fs.readFileSync(
  path.join(mobileDirectory, 'services/userService.ts'),
  'utf8',
);

test('registration full responses are displayed in Create Account', () => {
  assert.match(
    authControllerSource,
    /Huddle Up is currently in limited early access\. Registration is full\./,
  );
  assert.match(
    userServiceSource,
    /if \(status === 409\) \{\s*return fallback \|\| 'An account with this email already exists\.';/,
  );
  assert.match(createAccountSource, /setError\(err instanceof Error \? err\.message/);
});
