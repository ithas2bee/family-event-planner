import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import type { EventLocation } from '@/services/locationService';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { getMapCameraOptions, MAP_STYLE_URL } from './maplibreMapConfig';
import type { Region } from 'react-native-maps';

type Props = {
  style: StyleProp<ViewStyle>;
  region: Region;
  location: EventLocation | null;
};

export function EventLocationMap({ style, region, location }: Props) {
  const camera = getMapCameraOptions(region);

  return (
    <Map key={`${camera.center[0]},${camera.center[1]}`} style={style} mapStyle={MAP_STYLE_URL}>
      <Camera initialViewState={camera} />
      {location ? (
        <Marker id="selected-location" lngLat={[location.longitude, location.latitude]}>
          <View style={styles.marker}>
            <View style={styles.markerCenter} />
          </View>
        </Marker>
      ) : null}
    </Map>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#087AC5',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  markerCenter: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
});
