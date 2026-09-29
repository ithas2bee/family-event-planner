import type { EventLocation } from '@/services/locationService';
import MapView, { Marker, type Region } from 'react-native-maps';
import type { StyleProp, ViewStyle } from 'react-native';

type Props = {
  style: StyleProp<ViewStyle>;
  region: Region;
  location: EventLocation | null;
};

export function EventLocationMap({ style, region, location }: Props) {
  return (
    <MapView style={style} region={region}>
      {location ? (
        <Marker
          coordinate={{ latitude: location.latitude, longitude: location.longitude }}
          title={location.name}
          description={location.address}
        />
      ) : null}
    </MapView>
  );
}
