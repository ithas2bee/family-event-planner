const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  EVENT_IMAGE_PRESETS,
  eventImagePickerReducer,
  initialEventImagePickerState,
  isEventImagePresetSelected,
  selectEventImagePreset,
} = require('../../../constants/eventImagePresets.ts');
const selectorPath = require.resolve('../EventImageSelector.tsx');
const selectorSource = fs.readFileSync(selectorPath, 'utf8');
const componentDirectory = path.dirname(selectorPath);
const assetResolverPath = path.resolve(componentDirectory, '../../constants/eventImagePresetAssets.ts');
const assetResolverSource = fs.readFileSync(assetResolverPath, 'utf8');
const cardSource = fs.readFileSync(path.resolve(componentDirectory, '../upcoming-event-card.tsx'), 'utf8');
const allEventsSource = fs.readFileSync(path.resolve(componentDirectory, '../../app/events.tsx'), 'utf8');
const eventDetailsSource = fs.readFileSync(path.resolve(componentDirectory, '../../app/event/[eventId].tsx'), 'utf8');
const homeSource = fs.readFileSync(path.resolve(componentDirectory, '../../app/family-home.tsx'), 'utf8');
const createEventSource = fs.readFileSync(path.resolve(componentDirectory, '../../app/create-event.tsx'), 'utf8');
const eventServiceSource = fs.readFileSync(path.resolve(componentDirectory, '../../services/eventService.ts'), 'utf8');

test('provides exactly eighteen unique event image presets with the requested labels', () => {
  const keys = EVENT_IMAGE_PRESETS.map((preset) => preset.key);
  const labels = EVENT_IMAGE_PRESETS.map((preset) => preset.label);

  assert.equal(keys.length, 18);
  assert.equal(new Set(keys).size, 18);
  assert.deepEqual(keys, [
    'family-picnic',
    'birthday-party',
    'family-dinner',
    'game-night',
    'outdoor-adventure',
    'sports-day',
    'beach-day',
    'holiday-gathering',
    'arts-and-crafts',
    'backyard-bbq',
    'cruise-event',
    'camping-trip',
    'movie-night',
    'pool-party',
    'mall-outing',
    'sip-and-paint',
    'water-party',
    'kids-park',
  ]);
  assert.deepEqual(labels, [
    'Family Picnic',
    'Birthday Party',
    'Family Dinner',
    'Game Night',
    'Outdoor Adventure',
    'Sports Day',
    'Beach Day',
    'Holiday Gathering',
    'Arts & Crafts',
    'Backyard BBQ',
    'Cruise Event',
    'Camping Trip',
    'Movie Night',
    'Pool Party',
    'Mall Outing',
    'Sip & Paint',
    'Water Party',
    'Kids Park',
  ]);
});

test('maps every preset to exactly one bundled local JPG', () => {
  const assetDirectory = path.resolve(path.dirname(selectorPath), '../../assets/images/event-presets');
  const assetFiles = fs.readdirSync(assetDirectory).filter((file) => file.endsWith('.jpg')).sort();
  const mappedFiles = EVENT_IMAGE_PRESETS.map(({ imageAsset }) => imageAsset).sort();
  const expectedMappings = {
    'family-picnic': 'picnic.jpg',
    'birthday-party': 'happy-birthday.jpg',
    'family-dinner': 'family-dinner.jpg',
    'game-night': 'game-night.jpg',
    'outdoor-adventure': 'Outside-adventure.jpg',
    'sports-day': 'sports.jpg',
    'beach-day': 'beach.jpg',
    'holiday-gathering': 'xmas.jpg',
    'arts-and-crafts': 'arts-and-craft.jpg',
    'backyard-bbq': 'Bbq.jpg',
    'cruise-event': 'boat.jpg',
    'camping-trip': 'camping.jpg',
    'movie-night': 'movie-night.jpg',
    'pool-party': 'pool-party.jpg',
    'mall-outing': 'mall-outing.jpg',
    'sip-and-paint': 'sip-and-paint.jpg',
    'water-party': 'water-games.jpg',
    'kids-park': 'kids-park.jpg',
  };
  const mappings = [...assetResolverSource.matchAll(
    /^\s*'([^']+\.jpg)': require\('@\/assets\/images\/event-presets\/([^']+\.jpg)'\),?$/gm,
  )];

  assert.equal(assetFiles.length, 18);
  assert.equal(new Set(mappedFiles).size, 18);
  assert.deepEqual(mappedFiles, assetFiles);
  assert.deepEqual(Object.fromEntries(EVENT_IMAGE_PRESETS.map(({ key, imageAsset }) => [key, imageAsset])), expectedMappings);
  assert.deepEqual(mappings.map(([, assetKey]) => assetKey).sort(), mappedFiles);
  for (const [mapping, assetKey, file] of mappings) {
    assert.equal(assetKey, file);
    assert.ok(fs.existsSync(path.join(assetDirectory, file)));
    assert.ok(assetResolverSource.includes(mapping));
  }
  assert.match(selectorSource, /getEventImagePresetSource\(selectedPreset\.key\)/);
  assert.match(selectorSource, /getEventImagePresetSource\(preset\.key\)/);
  assert.match(cardSource, /getEventImagePresetSource\(item\.eventImagePresetKey\)/);
  assert.match(homeSource, /eventImagePresetKey: event\.eventImagePresetKey/);
  assert.match(assetResolverSource, /'happy-birthday\.jpg': require\('@\/assets\/images\/event-presets\/happy-birthday\.jpg'\)/);
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
  assert.match(selectorSource, /EVENT_PRESET_IMAGE_ASPECT_RATIO/);
  assert.match(selectorSource, /resizeMode="contain"/);
  assert.match(selectorSource, /<View style=\{styles\.imageFrame\}>[\s\S]*<Image[\s\S]*style=\{styles\.image\}[\s\S]*resizeMode="contain"/);
  assert.match(selectorSource, /<View style=\{styles\.labelArea\}>[\s\S]*\{preset\.label\}/);
  assert.match(selectorSource, /height: 38/);
  assert.match(selectorSource, /borderRadius: 14/);
  assert.match(selectorSource, /selectedOption: \{ borderColor: '#087AC5'/);
  assert.match(selectorSource, /name="check"/);
  assert.match(selectorSource, /centerTitle\s+showHandle/);
  assert.match(selectorSource, /imageFrame: \{[\s\S]*aspectRatio: EVENT_PRESET_IMAGE_ASPECT_RATIO/);
  assert.match(selectorSource, /image: \{[\s\S]*position: 'absolute'[\s\S]*width: '100%'[\s\S]*height: '100%'/);
});

test('upcoming event cards render the selected preset image and preserve no-image styling', () => {
  assert.match(cardSource, /const imageSource = getEventImagePresetSource\(item\.eventImagePresetKey\)/);
  assert.match(cardSource, /<View style=\{styles\.imageFrame\}>[\s\S]*<Image source=\{imageSource\} style=\{styles\.imageBackground\} resizeMode="contain" \/>/);
  assert.match(cardSource, /import \{ EVENT_PRESET_IMAGE_ASPECT_RATIO \} from '@\/constants\/eventImagePresets'/);
  assert.match(cardSource, /imageBackground: \{\s*width: '100%',\s*aspectRatio: EVENT_PRESET_IMAGE_ASPECT_RATIO/);
  assert.match(cardSource, /imageCard: \{\s*height: 320/);
  assert.match(cardSource, /imageFrame: \{[\s\S]*position: 'absolute'[\s\S]*justifyContent: 'center'/);
  assert.match(cardSource, /imageCardTitle: \{\s*color: '#FFFFFF'/);
  assert.match(cardSource, /<View style=\{\[styles\.header, \{ backgroundColor: tone\.background \}\]\}>/);
  assert.match(cardSource, /eventImagePresetKey\?: string \| null/);
});

test('View All Events renders selected images as landscape cards and preserves the icon fallback', () => {
  assert.match(allEventsSource, /getEventImagePresetSource\(event\.eventImagePresetKey\)/);
  assert.match(allEventsSource, /imageCard: \{[^}]*aspectRatio: EVENT_PRESET_IMAGE_ASPECT_RATIO/);
  assert.match(allEventsSource, /imageSource \? \([\s\S]*<Image source=\{imageSource\} style=\{styles\.eventImageBackground\} resizeMode="contain" \/>[\s\S]*<ThemedText type="defaultSemiBold" style=\{styles\.imageCardTitle\}/);
  assert.match(allEventsSource, /eventImageBackground: \{[\s\S]*width: '100%'[\s\S]*height: '100%'/);
  assert.match(allEventsSource, /imageDateBadge:[\s\S]*backgroundColor: '#FFFFFF'/);
  assert.match(allEventsSource, /\) : \([\s\S]*<MaterialIcons name=\{tone\.icon\}/);
});

test('Events page reloads its event list whenever it regains focus', () => {
  assert.match(allEventsSource, /useFocusEffect\(useCallback\(\(\) => \{[\s\S]*getEventsByGroup\(groupIdValue\)[\s\S]*\}, \[groupIdValue, isReady\]\)\)/);
});

test('Event Details uses a landscape preset hero with its title and preserves existing fallbacks', () => {
  assert.match(eventDetailsSource, /getEventImagePresetSource\(event\.eventImagePresetKey\)/);
  assert.match(eventDetailsSource, /presetHero: \{[\s\S]*aspectRatio: EVENT_PRESET_IMAGE_ASPECT_RATIO/);
  assert.match(eventDetailsSource, /presetHero: \{[\s\S]*padding: 0/);
  assert.match(eventDetailsSource, /presetHeroCaption: \{[\s\S]*margin: Spacing\.md/);
  assert.match(eventDetailsSource, /heroImage: \{[\s\S]*width: '100%'[\s\S]*height: '100%'/);
  assert.match(eventDetailsSource, /eventImagePresetSource \? \([\s\S]*<Image source=\{eventImagePresetSource\} style=\{styles\.heroImage\} resizeMode="contain" \/>[\s\S]*\) : event\.imageUrl \? \([\s\S]*<Image source=\{\{ uri: event\.imageUrl \}\} style=\{styles\.heroImage\} \/>/);
  assert.match(eventDetailsSource, /eventImagePresetSource \? \([\s\S]*<ThemedText type="title" style=\{styles\.presetHeroTitle\}/);
  assert.match(eventDetailsSource, /eventImagePresetSource \? \([\s\S]*<ThemedText type="title" style=\{styles\.presetHeroTitle\}[\s\S]*\) : \([\s\S]*<ThemedText style=\{styles\.heroLabel\}>FAMILY EVENT/);
  assert.match(eventDetailsSource, /\{!eventImagePresetSource \? \([\s\S]*styles\.titleRow/);
  assert.match(eventDetailsSource, /!event\.imageUrl \? <MaterialIcons name="celebration"/);
});

test('selected preset key travels from Create Event through the service to the upcoming card', () => {
  assert.match(createEventSource, /<EventImageSelector value=\{eventImagePresetKey\} onChange=\{setEventImagePresetKey\} \/>/);
  assert.match(createEventSource, /await createEvent\(\{[\s\S]*eventImagePresetKey,/);
  assert.match(eventServiceSource, /body: JSON\.stringify\(request\)/);
  assert.match(eventServiceSource, /eventImagePresetKey: typeof event\.eventImagePresetKey === 'string' \? event\.eventImagePresetKey : null/);
  assert.match(homeSource, /eventImagePresetKey: event\.eventImagePresetKey/);
  assert.match(cardSource, /const imageSource = getEventImagePresetSource\(item\.eventImagePresetKey\)/);
  assert.match(cardSource, /\{imageSource \? \([\s\S]*<Image source=\{imageSource\} style=\{styles\.imageBackground\} resizeMode="contain" \/>[\s\S]*\) : \(/);
});
