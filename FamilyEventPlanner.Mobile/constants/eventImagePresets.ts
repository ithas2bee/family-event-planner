export const EVENT_IMAGE_PRESETS = [
  { key: 'family-picnic', label: 'Family picnic' },
  { key: 'birthday-party', label: 'Birthday party' },
  { key: 'family-dinner', label: 'Family dinner' },
  { key: 'game-night', label: 'Game night' },
  { key: 'outdoor-adventure', label: 'Outdoor adventure' },
  { key: 'sports-day', label: 'Sports day' },
  { key: 'beach-day', label: 'Beach day' },
  { key: 'holiday-gathering', label: 'Holiday gathering' },
  { key: 'arts-and-crafts', label: 'Arts and crafts' },
  { key: 'backyard-bbq', label: 'Backyard BBQ' },
] as const;

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
