export const EVENT_IMAGE_PRESETS = [
  { key: 'family-picnic', label: 'Family Picnic', imageAsset: 'picnic.jpg' },
  { key: 'birthday-party', label: 'Birthday Party', imageAsset: 'happy-birthday.jpg' },
  { key: 'family-dinner', label: 'Family Dinner', imageAsset: 'family-dinner.jpg' },
  { key: 'game-night', label: 'Game Night', imageAsset: 'game-night.jpg' },
  { key: 'outdoor-adventure', label: 'Outdoor Adventure', imageAsset: 'Outside-adventure.jpg' },
  { key: 'sports-day', label: 'Sports Day', imageAsset: 'sports.jpg' },
  { key: 'beach-day', label: 'Beach Day', imageAsset: 'beach.jpg' },
  { key: 'holiday-gathering', label: 'Holiday Gathering', imageAsset: 'xmas.jpg' },
  { key: 'arts-and-crafts', label: 'Arts & Crafts', imageAsset: 'arts-and-craft.jpg' },
  { key: 'backyard-bbq', label: 'Backyard BBQ', imageAsset: 'Bbq.jpg' },
  { key: 'cruise-event', label: 'Cruise Event', imageAsset: 'boat.jpg' },
  { key: 'camping-trip', label: 'Camping Trip', imageAsset: 'camping.jpg' },
  { key: 'movie-night', label: 'Movie Night', imageAsset: 'movie-night.jpg' },
  { key: 'pool-party', label: 'Pool Party', imageAsset: 'pool-party.jpg' },
  { key: 'mall-outing', label: 'Mall Outing', imageAsset: 'mall-outing.jpg' },
  { key: 'sip-and-paint', label: 'Sip & Paint', imageAsset: 'sip-and-paint.jpg' },
  { key: 'water-party', label: 'Water Party', imageAsset: 'water-games.jpg' },
  { key: 'kids-park', label: 'Kids Park', imageAsset: 'kids-park.jpg' },
] as const;

export const EVENT_PRESET_IMAGE_ASPECT_RATIO = 2816 / 1536;

export type EventImagePresetKey = (typeof EVENT_IMAGE_PRESETS)[number]['key'];

export function selectEventImagePreset(
  _selected: string | null | undefined,
  next: EventImagePresetKey | null,
): EventImagePresetKey | null {
  return next;
}

export function isEventImagePresetSelected(
  selected: string | null | undefined,
  preset: EventImagePresetKey,
): boolean {
  return selected === preset;
}

export type EventImagePickerState = {
  visible: boolean;
  draftKey: string | null;
};

export type EventImagePickerAction =
  | { type: 'open'; selectedKey: string | null | undefined }
  | { type: 'select'; selectedKey: EventImagePresetKey | null }
  | { type: 'done' }
  | { type: 'dismiss' };

export const initialEventImagePickerState: EventImagePickerState = {
  visible: false,
  draftKey: null,
};

export function eventImagePickerReducer(
  state: EventImagePickerState,
  action: EventImagePickerAction,
): EventImagePickerState {
  switch (action.type) {
    case 'open':
      return { visible: true, draftKey: action.selectedKey ?? null };
    case 'select':
      return { ...state, draftKey: action.selectedKey };
    case 'done':
    case 'dismiss':
      return { ...state, visible: false };
  }
}
