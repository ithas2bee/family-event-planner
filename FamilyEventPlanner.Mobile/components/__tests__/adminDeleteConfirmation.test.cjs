const assert = require('node:assert/strict');
const test = require('node:test');
const { createAdminDeleteConfirmation } = require('../admin-delete-confirmation.js');
const fs = require('node:fs');
const path = require('node:path');

function createHarness(onDelete) {
  const alerts = [];
  const deletingValues = [];
  let deleted = 0;
  const confirmation = createAdminDeleteConfirmation({
    contentType: 'Event',
    onDelete,
    onDeleted: () => { deleted += 1; },
    setDeleting: (value) => deletingValues.push(value),
    showAlert: (...args) => alerts.push(args),
  });
  return { confirmation, alerts, deletingValues, deleted: () => deleted };
}

test('cancelling confirmation leaves content unchanged', async () => {
  let deleteCalls = 0;
  const harness = createHarness(async () => { deleteCalls += 1; });

  const cancel = harness.confirmation.buttons[0];
  assert.equal(cancel.text, 'Cancel');
  assert.equal(cancel.onPress, undefined);
  assert.match(harness.confirmation.message, /cannot be undone/);
  assert.equal(deleteCalls, 0);
  assert.deepEqual(harness.alerts, []);
});

test('confirming deletion shows success and navigates after acknowledgement', async () => {
  let deleteCalls = 0;
  const harness = createHarness(async () => { deleteCalls += 1; });

  await harness.confirmation.buttons[1].onPress();

  assert.equal(deleteCalls, 1);
  assert.equal(harness.alerts[0][0], 'Deleted');
  assert.equal(harness.deleted(), 0);
  harness.alerts[0][2][0].onPress();
  assert.equal(harness.deleted(), 1);
  assert.deepEqual(harness.deletingValues, [true, false]);
});

test('failed deletion shows an error without navigating', async () => {
  const harness = createHarness(async () => { throw new Error('Forbidden'); });

  await harness.confirmation.buttons[1].onPress();

  assert.equal(harness.alerts[0][0], 'Unable to delete');
  assert.equal(harness.alerts[0][1], 'Forbidden');
  assert.equal(harness.deleted(), 0);
  assert.deepEqual(harness.deletingValues, [true, false]);
});

test('delete permissions are scoped to each content record group and member', () => {
  const root = path.resolve(process.cwd());
  const eventSource = fs.readFileSync(path.join(root, 'app/event/[eventId].tsx'), 'utf8');
  const kickbackSource = fs.readFileSync(path.join(root, 'app/kickback/[kickbackId].tsx'), 'utf8');
  const pollSource = fs.readFileSync(path.join(root, 'app/poll/[pollId].tsx'), 'utf8');
  const announcementSource = fs.readFileSync(path.join(root, 'app/announcement/[announcementId].tsx'), 'utf8');

  assert.match(eventSource, /adminScope\?\.groupId === event\.familyGroupId/);
  assert.match(kickbackSource, /getGroupMembers\(result\.familyGroupId/);
  assert.match(kickbackSource, /adminScope\?\.groupId === kickback\.familyGroupId/);
  assert.match(pollSource, /getGroupMembers\(data\.familyGroupId/);
  assert.match(pollSource, /adminScope\?\.groupId === poll\.familyGroupId/);
  assert.match(announcementSource, /adminScope\?\.groupId === String\(params\.groupId/);
});
