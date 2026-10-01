const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  EVENT_IMAGE_PRESETS,
  isEventImagePresetSelected,
  selectEventImagePreset,
} = require('../../../constants/eventImagePresets.ts');
const {
  eventImagePickerReducer,
  initialEventImagePickerState,
} = require('../../../constants/eventImagePickerState.ts');
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

test('picker opens with the existing event selection', () => {
  const opened = eventImagePickerReducer(initialEventImagePickerState, {
    type: 'open',
    selectedKey: 'beach-day',
  });

  assert.equal(opened.visible, true);
  assert.equal(opened.draftKey, 'beach-day');
  assert.equal(isEventImagePresetSelected(opened.draftKey, 'beach-day'), true);
});

test('picker keeps a changed preset selected until Done closes it', () => {
  const opened = eventImagePickerReducer(initialEventImagePickerState, {
    type: 'open',
    selectedKey: 'beach-day',
  });
  const selected = eventImagePickerReducer(opened, {
    type: 'select',
    selectedKey: 'game-night',
  });
  const closed = eventImagePickerReducer(selected, { type: 'done' });

  assert.equal(selected.visible, true);
  assert.equal(selected.draftKey, 'game-night');
  assert.equal(isEventImagePresetSelected(selected.draftKey, 'game-night'), true);
  assert.equal(closed.visible, false);
  assert.equal(closed.draftKey, 'game-night');
});

test('picker supports No image and dismisses without committing its draft', () => {
  const opened = eventImagePickerReducer(initialEventImagePickerState, {
    type: 'open',
    selectedKey: 'beach-day',
  });
  const cleared = eventImagePickerReducer(opened, {
    type: 'select',
    selectedKey: null,
  });
  const dismissed = eventImagePickerReducer(cleared, { type: 'dismiss' });

  assert.equal(cleared.draftKey, null);
  assert.equal(dismissed.visible, false);
  assert.equal(dismissed.draftKey, null);
  assert.equal(opened.draftKey, 'beach-day');
  assert.equal((selectorSource.match(/onChange\(/g) ?? []).length, 1);
});

test('picker UI uses a compact field, dimmed modal, two-column landscape gallery, and Done', () => {
  assert.match(selectorSource, /<ModalSheet[\s\S]*title="Choose an event image"/);
  assert.match(selectorSource, /: 'Pick an image'/);
  assert.match(selectorSource, /accessibilityLabel="No image"/);
  assert.match(selectorSource, /onPress=\{handleDone\}[\s\S]*>[\s\S]*Done/);
  assert.match(selectorSource, /width: '48\.5%'/);
  assert.match(selectorSource, /aspectRatio: 2\.15/);
  assert.match(selectorSource, /selectedOption: \{ borderColor: '#087AC5'/);
  assert.match(selectorSource, /name="check"/);
  assert.match(selectorSource, /centerTitle\s+showHandle/);
  assert.match(selectorSource, /image: \{ width: '100%', aspectRatio: 2\.15 \}/);
});
