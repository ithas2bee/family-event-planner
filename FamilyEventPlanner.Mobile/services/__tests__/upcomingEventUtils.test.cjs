const assert = require('node:assert/strict');
const test = require('node:test');
const { filterUpcomingEvents } = require('../upcomingEventUtils.ts');

const now = new Date('2026-10-02T13:00:00.000Z');
const event = (id, startDate) => ({ id, startDate });

test('excludes events scheduled in the past', () => {
  assert.deepEqual(
    filterUpcomingEvents([event('past', '2026-10-02T12:59:59.999Z')], now),
    [],
  );
});

test('keeps an event scheduled later today', () => {
  assert.deepEqual(
    filterUpcomingEvents([event('later-today', '2026-10-02T13:00:00.001Z')], now).map(({ id }) => id),
    ['later-today'],
  );
});

test('excludes an event whose scheduled time has just passed or is now', () => {
  assert.deepEqual(
    filterUpcomingEvents([
      event('just-passed', '2026-10-02T12:59:59.999Z'),
      event('now', '2026-10-02T13:00:00.000Z'),
    ], now),
    [],
  );
});

test('keeps future events and preserves their existing order among mixed dates', () => {
  assert.deepEqual(
    filterUpcomingEvents([
      event('past', '2026-10-01T13:00:00.000Z'),
      event('future-first', '2026-10-04T13:00:00.000Z'),
      event('future-second', '2026-10-03T13:00:00.000Z'),
    ], now).map(({ id }) => id),
    ['future-first', 'future-second'],
  );
});
