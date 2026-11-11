import type { EventLocation } from '@/services/locationService';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { ThemedText } from '../themed-text';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Props = {
  style: StyleProp<ViewStyle>;
  region: Region;
  location: EventLocation | null;
};

export function EventLocationMap({ style, location }: Props) {
  return (
    <View style={[styles.container, style]}>
      <ThemedText style={styles.title}>{location?.name ?? 'Map preview'}</ThemedText>
      <ThemedText style={styles.description}>
        {location?.address ?? 'Search for a place to preview its location.'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E8F0F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#16213A',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: '#56708E',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
});
