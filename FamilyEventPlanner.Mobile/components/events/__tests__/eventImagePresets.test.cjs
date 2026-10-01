const assert = require('node:assert/strict');
const test = require('node:test');
const {
  EVENT_IMAGE_PRESETS,
  isEventImagePresetSelected,
  selectEventImagePreset,
} = require('../../../constants/eventImagePresets.ts');

test('provides exactly ten unique event image presets', () => {
  const keys = EVENT_IMAGE_PRESETS.map((preset) => preset.key);

  assert.equal(keys.length, 10);
  assert.equal(new Set(keys).size, 10);
});

test('restores the selected preset for an existing event', () => {
  assert.equal(isEventImagePresetSelected('beach-day', 'beach-day'), true);
  assert.equal(isEventImagePresetSelected(null, 'beach-day'), false);
});

test('selecting another preset updates the submitted key', () => {
  const selected = selectEventImagePreset('beach-day', 'game-night');

  assert.equal(selected, 'game-night');
  assert.equal(isEventImagePresetSelected(selected, 'game-night'), true);
  assert.equal(isEventImagePresetSelected(selected, 'beach-day'), false);
});

test('clearing a preset leaves the event without an image', () => {
  assert.equal(selectEventImagePreset('beach-day', null), null);
});
