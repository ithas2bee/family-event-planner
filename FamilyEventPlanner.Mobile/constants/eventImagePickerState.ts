import { EventImagePresetKey } from './eventImagePresets';

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
