const assert = require('node:assert/strict');
const test = require('node:test');
const appConfig = require('./app.json');

test('forces the app to use the light user interface style', () => {
  assert.equal(appConfig.expo.userInterfaceStyle, 'light');
});
