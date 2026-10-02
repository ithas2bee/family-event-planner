import {
  EVENT_IMAGE_PRESETS,
  EventImagePresetKey,
  eventImagePickerReducer,
  initialEventImagePickerState,
  isEventImagePresetSelected,
  EVENT_PRESET_IMAGE_ASPECT_RATIO,
} from '@/constants/eventImagePresets';
import { getEventImagePresetSource } from '@/constants/eventImagePresetAssets';
import { ModalSheet } from '@/components/ui/modal-sheet';
import { ImmersiveButton } from '@/components/ui/immersive-button';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useReducer } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

type EventImageSelectorProps = {
  value?: string | null;
  onChange: (value: EventImagePresetKey | null) => void;
};

export function EventImageSelector({ value, onChange }: EventImageSelectorProps) {
  const [picker, dispatch] = useReducer(eventImagePickerReducer, initialEventImagePickerState);
  const selectedPreset = EVENT_IMAGE_PRESETS.find((preset) => preset.key === value);

  function handleDone() {
    onChange((picker.draftKey as EventImagePresetKey | null) ?? null);
    dispatch({ type: 'done' });
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={selectedPreset ? `Change event image, ${selectedPreset.label} selected` : 'Pick an image'}
        onPress={() => dispatch({ type: 'open', selectedKey: value })}
        style={styles.field}
      >
        {selectedPreset ? (
          <Image source={getEventImagePresetSource(selectedPreset.key)} style={styles.thumbnail} />
        ) : (
          <MaterialIcons name="image" size={23} color="#087AC5" />
        )}
        <ThemedText style={styles.fieldText}>
          {selectedPreset?.label ?? 'Pick an image'}
        </ThemedText>
        <MaterialIcons name="chevron-right" size={23} color="#45617F" />
      </Pressable>

      <ModalSheet
        visible={picker.visible}
        title="Choose an event image"
        onClose={() => dispatch({ type: 'dismiss' })}
        centerTitle
        showHandle
        actions={
          <ImmersiveButton
            accessibilityLabel="Done choosing event image"
            onPress={handleDone}
            style={styles.doneButton}
          >
            Done
          </ImmersiveButton>
        }
      >
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: picker.draftKey == null }}
          accessibilityLabel="No image"
          onPress={() => dispatch({ type: 'select', selectedKey: null })}
          style={[styles.noImage, picker.draftKey == null && styles.noImageSelected]}
        >
          <MaterialIcons name="image" size={22} color="#56708E" />
          <ThemedText style={styles.noImageText}>No image</ThemedText>
        </Pressable>
        <View style={styles.grid}>
          {EVENT_IMAGE_PRESETS.map((preset) => {
            const selected = isEventImagePresetSelected(picker.draftKey, preset.key);

            return (
              <Pressable
                key={preset.key}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Select ${preset.label} image`}
                onPress={() => dispatch({ type: 'select', selectedKey: preset.key })}
                style={[styles.option, selected && styles.selectedOption]}
              >
                <View style={styles.imageFrame}>
                  <Image
                    source={getEventImagePresetSource(preset.key)}
                    style={styles.image}
                    resizeMode="contain"
                  />
                  {selected && (
                    <View style={styles.selectedIndicator}>
                      <MaterialIcons name="check" size={17} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <View style={styles.labelArea}>
                  <ThemedText style={styles.label} numberOfLines={1}>{preset.label}</ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ModalSheet>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#DCE5EF',
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  thumbnail: { width: 76, height: 42, borderRadius: 7 },
  fieldText: { color: '#45617F', fontSize: 13, fontWeight: '600', flex: 1 },
  noImage: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#DCE5EF',
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  noImageSelected: { borderColor: '#087AC5', borderWidth: 2, backgroundColor: '#F0F8FE' },
  noImageText: { color: '#45617F', fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  option: {
    width: '48.5%',
    borderWidth: 1,
    borderColor: '#E4EAF2',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    shadowColor: '#203B5A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  selectedOption: { borderColor: '#087AC5', borderWidth: 2, elevation: 4 },
  imageFrame: {
    width: '100%',
    aspectRatio: EVENT_PRESET_IMAGE_ASPECT_RATIO,
    overflow: 'hidden',
    backgroundColor: '#E4EAF2',
  },
  image: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#087AC5',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  labelArea: {
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 9,
    backgroundColor: '#FFFFFF',
  },
  label: { color: '#16213A', fontSize: 12, fontWeight: '700' },
  doneButton: { minHeight: 52, borderRadius: 11, backgroundColor: '#087AC5', width: '100%' },
});
