import type { ImageSourcePropType } from 'react-native';

import { EVENT_IMAGE_PRESETS } from '@/constants/eventImagePresets';

const presetImages: Record<(typeof EVENT_IMAGE_PRESETS)[number]['imageAsset'], ImageSourcePropType> = {
  'picnic.jpg': require('@/assets/images/event-presets/picnic.jpg'),
  'happy-birthday.jpg': require('@/assets/images/event-presets/happy-birthday.jpg'),
  'family-dinner.jpg': require('@/assets/images/event-presets/family-dinner.jpg'),
  'game-night.jpg': require('@/assets/images/event-presets/game-night.jpg'),
  'Outside-adventure.jpg': require('@/assets/images/event-presets/Outside-adventure.jpg'),
  'sports.jpg': require('@/assets/images/event-presets/sports.jpg'),
  'beach.jpg': require('@/assets/images/event-presets/beach.jpg'),
  'xmas.jpg': require('@/assets/images/event-presets/xmas.jpg'),
  'arts-and-craft.jpg': require('@/assets/images/event-presets/arts-and-craft.jpg'),
  'Bbq.jpg': require('@/assets/images/event-presets/Bbq.jpg'),
  'boat.jpg': require('@/assets/images/event-presets/boat.jpg'),
  'camping.jpg': require('@/assets/images/event-presets/camping.jpg'),
  'movie-night.jpg': require('@/assets/images/event-presets/movie-night.jpg'),
  'pool-party.jpg': require('@/assets/images/event-presets/pool-party.jpg'),
  'mall-outing.jpg': require('@/assets/images/event-presets/mall-outing.jpg'),
  'sip-and-paint.jpg': require('@/assets/images/event-presets/sip-and-paint.jpg'),
  'water-games.jpg': require('@/assets/images/event-presets/water-games.jpg'),
  'kids-park.jpg': require('@/assets/images/event-presets/kids-park.jpg'),
};

export function getEventImagePresetSource(presetKey: string | null | undefined) {
  const preset = EVENT_IMAGE_PRESETS.find(({ key }) => key === presetKey);
  return preset ? presetImages[preset.imageAsset] : undefined;
}
