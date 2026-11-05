const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const read = (file) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
const activitySource = read('app/activity.tsx');
const serviceSource = read('services/activityService.ts');

test('expiration warnings in the Notifications Log offer the one-time extension action', () => {
  assert.match(serviceSource, /getExpirationNotifications/);
  assert.match(serviceSource, /PollExpiring.*AnnouncementExpiring/);
  assert.match(serviceSource, /\/api\/\$\{path\}\/\$\{relatedEntityId\}\/extend/);
  assert.match(activitySource, /getExpirationNotifications\(groupIdValue\)/);
  assert.match(activitySource, /item\.activityType === 'PollExpiring'.*item\.activityType === 'AnnouncementExpiring'/s);
  assert.match(activitySource, /Extend by 48 hours/);
  assert.match(activitySource, /PollExpirationExtended/);
  assert.match(activitySource, /AnnouncementExpirationExtended/);
});
