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
  _selected: EventImagePresetKey | null | undefined,
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
