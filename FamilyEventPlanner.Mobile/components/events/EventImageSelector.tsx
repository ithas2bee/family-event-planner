import {
  EVENT_IMAGE_PRESETS,
  EventImagePresetKey,
  isEventImagePresetSelected,
  selectEventImagePreset,
} from '@/constants/eventImagePresets';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image, ImageSourcePropType, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

const presetImages: Record<EventImagePresetKey, ImageSourcePropType> = {
  'family-picnic': require('@/assets/images/event-presets/family-picnic.png'),
  'birthday-party': require('@/assets/images/event-presets/birthday-party.png'),
  'family-dinner': require('@/assets/images/event-presets/family-dinner.png'),
  'game-night': require('@/assets/images/event-presets/game-night.png'),
  'outdoor-adventure': require('@/assets/images/event-presets/outdoor-adventure.png'),
  'sports-day': require('@/assets/images/event-presets/sports-day.png'),
  'beach-day': require('@/assets/images/event-presets/beach-day.png'),
  'holiday-gathering': require('@/assets/images/event-presets/holiday-gathering.png'),
  'arts-and-crafts': require('@/assets/images/event-presets/arts-and-crafts.png'),
  'backyard-bbq': require('@/assets/images/event-presets/backyard-bbq.png'),
};

type EventImageSelectorProps = {
  value?: string | null;
  onChange: (value: EventImagePresetKey | null) => void;
};

export function EventImageSelector({ value, onChange }: EventImageSelectorProps) {
  const noImageSelected = value == null;

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: noImageSelected }}
        accessibilityLabel="No event image"
        onPress={() => onChange(selectEventImagePreset(value, null))}
        style={[styles.noImage, noImageSelected && styles.noImageSelected]}
      >
        <MaterialIcons name={noImageSelected ? 'radio-button-checked' : 'radio-button-unchecked'} size={19} color="#087AC5" />
        <ThemedText style={styles.noImageText}>No image</ThemedText>
      </Pressable>
      <View style={styles.grid}>
        {EVENT_IMAGE_PRESETS.map((preset) => {
          const selected = isEventImagePresetSelected(value, preset.key);

          return (
            <Pressable
              key={preset.key}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`Select ${preset.label} image`}
              onPress={() => onChange(selectEventImagePreset(value, preset.key))}
              style={[styles.option, selected && styles.selectedOption]}
            >
              <Image source={presetImages[preset.key]} style={styles.image} />
              {selected && (
                <View style={styles.selectedIndicator}>
                  <MaterialIcons name="check" size={16} color="#FFFFFF" />
                </View>
              )}
              <ThemedText style={styles.label} numberOfLines={1}>{preset.label}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  noImage: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: '#DCE5EF',
    borderRadius: 9,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  noImageSelected: { borderColor: '#087AC5', backgroundColor: '#F0F8FE' },
  noImageText: { color: '#45617F', fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  option: {
    width: '31.5%',
    borderWidth: 2,
    borderColor: '#E4EAF2',
    borderRadius: 9,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  selectedOption: { borderColor: '#087AC5' },
  image: { width: '100%', aspectRatio: 1.5 },
  selectedIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 23,
    height: 23,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#087AC5',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  label: { color: '#45617F', fontSize: 9, fontWeight: '600', textAlign: 'center', paddingVertical: 4, paddingHorizontal: 2 },
});
