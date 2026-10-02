const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const mobileRoot = process.cwd();
const modalSource = fs.readFileSync(path.join(mobileRoot, 'components/events/EventDateModal.tsx'), 'utf8');
const createEventSource = fs.readFileSync(path.join(mobileRoot, 'app/create-event.tsx'), 'utf8');
const editEventSource = fs.readFileSync(path.join(mobileRoot, 'app/event/[eventId].tsx'), 'utf8');

test('date, quick times, start time, and end time appear in the intended vertical order', () => {
  const steps = [
    '<StepHeading number={1} title="Select Date"',
    '<StepHeading number={2} title="Quick Times (Optional)"',
    '<StepHeading number={3} title="Select Start Time"',
    '<StepHeading number={4} title="Select End Time"',
  ];
  const positions = steps.map((step) => modalSource.indexOf(step));

  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  assert.doesNotMatch(modalSource, /pickerColumns|timeInput/);
});

test('manual time selection scrolls hours, every minute, and AM/PM with a centered selected row', () => {
  assert.match(modalSource, /Array\.from\(\{ length: 60 \}/);
  assert.match(modalSource, /snapToInterval={WHEEL_ITEM_HEIGHT}/);
  assert.match(modalSource, /onMomentumScrollEnd={selectAtOffset}/);
  assert.match(modalSource, /wheelItemSelected/);
  assert.match(modalSource, /periods: AmPm\[\] = \['AM', 'PM'\]/);
});

test('adding an end time initializes its date and Apply returns the selected end timestamp', () => {
  assert.match(modalSource, /function addEndTime\(\)[\s\S]*?setSelectedEnd\(nextEnd\)/);
  assert.match(modalSource, /const builtEnd = showEndPicker && selectedEnd[\s\S]*?withTime\(selectedEnd, endTime\.hour, endTime\.minute, endTime\.amPm\)/);
  assert.match(modalSource, /onChange\(builtStart, builtEnd\)/);
  assert.match(modalSource, /minute: value\.getMinutes\(\)/);
});

test('Create Event and Edit Event both use the shared selector and persist end dates', () => {
  assert.match(createEventSource, /<EventDateModal[\s\S]*?onChange={handleDateChange}/);
  assert.match(createEventSource, /setEndDate\(newEndDate \? newEndDate\.toISOString\(\) : ''\)/);
  assert.match(editEventSource, /<EventDateModal[\s\S]*?endDate=\{event\.endDate \? new Date\(event\.endDate\) : null\}/);
  assert.match(editEventSource, /endDate: endDate \? endDate\.toISOString\(\) : undefined/);
});

test('End Time heading gives its title flexible width and keeps Clear inside the card', () => {
  assert.match(modalSource, /endHeading: \{ width: '100%'/);
  assert.match(modalSource, /stepHeading: \{ flex: 1, minWidth: 0/);
  assert.match(modalSource, /stepTitleContainer: \{ flex: 1, minWidth: 0/);
  assert.match(modalSource, /endActionButton: \{ flexShrink: 0, marginLeft: 8 \}/);
  assert.match(modalSource, /style={styles\.endActionButton}/);
});
