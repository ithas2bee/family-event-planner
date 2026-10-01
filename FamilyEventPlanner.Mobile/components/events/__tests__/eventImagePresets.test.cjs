const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  EVENT_IMAGE_PRESETS,
  isEventImagePresetSelected,
  selectEventImagePreset,
} = require('../../../constants/eventImagePresets.ts');
const selectorPath = require.resolve('../EventImageSelector.tsx');
const selectorSource = fs.readFileSync(selectorPath, 'utf8');

test('provides exactly ten unique event image presets', () => {
  const keys = EVENT_IMAGE_PRESETS.map((preset) => preset.key);

  assert.equal(keys.length, 10);
  assert.equal(new Set(keys).size, 10);
});

test('maps every preset to one of ten bundled local images', () => {
  const keys = EVENT_IMAGE_PRESETS.map((preset) => preset.key).sort();
  const assetDirectory = path.resolve(path.dirname(selectorPath), '../../assets/images/event-presets');
  const assetFiles = fs.readdirSync(assetDirectory).sort();
  const mappings = [...selectorSource.matchAll(
    /^\s*'([^']+)': require\('@\/assets\/images\/event-presets\/([^']+\.png)'\),?$/gm,
  )];

  assert.equal(assetFiles.length, 10);
  assert.deepEqual(assetFiles.map((file) => file.replace(/\.png$/, '')), keys);
  assert.deepEqual(mappings.map(([, key]) => key).sort(), keys);
  for (const [, key, file] of mappings) {
    assert.equal(file, `${key}.png`);
    assert.ok(fs.existsSync(path.join(assetDirectory, file)));
  }
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
