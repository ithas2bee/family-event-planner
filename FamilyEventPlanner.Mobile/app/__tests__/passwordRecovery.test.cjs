const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileDirectory = process.cwd();
const appDirectory = path.resolve(mobileDirectory, 'app');
const apiDirectory = path.resolve(mobileDirectory, '../FamilyEventPlanner.Api');
const loginSource = fs.readFileSync(path.join(appDirectory, 'login.tsx'), 'utf8');
const forgotPasswordSource = fs.readFileSync(path.join(appDirectory, 'forgot-password.tsx'), 'utf8');
const forgotUsernameSource = fs.readFileSync(path.join(appDirectory, 'forgot-username.tsx'), 'utf8');
const resetPasswordSource = fs.readFileSync(path.join(appDirectory, 'reset-password.tsx'), 'utf8');
const userServiceSource = fs.readFileSync(path.join(mobileDirectory, 'services/userService.ts'), 'utf8');
const layoutSource = fs.readFileSync(path.join(appDirectory, '_layout.tsx'), 'utf8');
const appConfig = JSON.parse(fs.readFileSync(path.join(mobileDirectory, 'app.json'), 'utf8'));
const authControllerSource = fs.readFileSync(path.join(apiDirectory, 'Controllers/AuthController.cs'), 'utf8');

test('sign in provides password and username recovery navigation', () => {
  assert.match(loginSource, /Forgot Password\?/);
  assert.match(loginSource, /pathname: '\/forgot-password'/);
  assert.match(loginSource, /Forgot Username\?/);
  assert.match(loginSource, /router\.push\('\/forgot-username'\)/);
});

test('recovery screens are registered as public Expo routes', () => {
  for (const route of ['forgot-password', 'forgot-username', 'reset-password']) {
    assert.match(layoutSource, new RegExp(`'${route}'`));
    assert.match(layoutSource, new RegExp(`name="${route}"`));
  }
});

test('password recovery uses the API and shows generic request guidance', () => {
  assert.match(userServiceSource, /\/api\/auth\/forgot-password/);
  assert.match(forgotPasswordSource, /requestPasswordReset\(email\.trim\(\)\)/);
  assert.match(forgotPasswordSource, /If an account exists/);
});

test('password reset validates confirmation and applies the existing password rules', () => {
  assert.match(userServiceSource, /\/api\/auth\/reset-password/);
  assert.match(resetPasswordSource, /password !== confirmPassword/);
  assert.match(resetPasswordSource, /password\.length >= 8/);
  assert.match(resetPasswordSource, /\/\\d\//);
  assert.match(resetPasswordSource, /You can now sign in with your new password/);
});

test('username recovery explains that sign-in uses the registered email', () => {
  assert.match(forgotUsernameSource, /email address you registered with/);
  assert.match(forgotUsernameSource, /Contact Support/);
});

test('reset links use the app scheme configured for deep links', () => {
  assert.match(authControllerSource, new RegExp(`"${appConfig.expo.scheme}://reset-password"`));
});
