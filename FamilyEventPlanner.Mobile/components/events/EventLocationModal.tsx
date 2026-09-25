import { EventLocation, getLocationDetails, searchLocations } from '@/services/locationService';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { ThemedText } from '../themed-text';

type Props = {
  visible: boolean;
  location?: EventLocation | null;
  onChange: (location: EventLocation | null) => void;
  onClose: () => void;
};

const initialRegion: Region = { latitude: 39.8283, longitude: -98.5795, latitudeDelta: 30, longitudeDelta: 30 };

export function EventLocationModal({ visible, location, onChange, onClose }: Props) {
  const [draft, setDraft] = useState<EventLocation | null>(location ?? null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ placeId: string; description: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = useRef('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setDraft(location ?? null);
      setQuery('');
      setSuggestions([]);
      setError(null);
      token.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }, [visible, location]);

  useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current); }, []);

  const search = (value: string) => {
    setQuery(value);
    setError(null);
    if (debounce.current) clearTimeout(debounce.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        setBusy(true);
        setSuggestions(await searchLocations(value.trim(), token.current));
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Unable to search locations.');
      } finally {
        setBusy(false);
      }
    }, 350);
  };

  const selectSuggestion = async (placeId: string) => {
    try {
      setBusy(true);
      setError(null);
      const selected = await getLocationDetails(placeId, token.current);
      setDraft(selected);
      setSuggestions([]);
      setQuery('');
      token.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load that location.');
    } finally {
      setBusy(false);
    }
  };

  const region = draft ? { latitude: draft.latitude, longitude: draft.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 } : initialRegion;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel location selection">
            <ThemedText style={styles.cancel}>Cancel</ThemedText>
          </Pressable>
          <ThemedText style={styles.title}>Select Event Location</ThemedText>
          <View style={styles.spacer} />
        </View>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={21} color="#56708E" />
          <TextInput value={query} onChangeText={search} placeholder="Search for a place or address" placeholderTextColor="#8CA0B8" style={styles.input} />
          {busy ? <ActivityIndicator size="small" color="#087AC5" /> : null}
        </View>
        {suggestions.length > 0 ? (
          <View style={styles.suggestions}>
            {suggestions.map((item) => (
              <Pressable key={item.placeId} onPress={() => selectSuggestion(item.placeId)} style={styles.suggestion}>
                <MaterialIcons name="place" size={20} color="#087AC5" />
                <ThemedText style={styles.suggestionText}>{item.description}</ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}
        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
        <MapView provider={PROVIDER_GOOGLE} style={styles.map} region={region}>
          {draft ? <Marker coordinate={{ latitude: draft.latitude, longitude: draft.longitude }} title={draft.name} description={draft.address} /> : null}
        </MapView>
        {draft ? (
          <View style={styles.card}>
            <ThemedText style={styles.name}>{draft.name}</ThemedText>
            <ThemedText style={styles.address}>{draft.address}</ThemedText>
          </View>
        ) : <ThemedText style={styles.empty}>Search for a place to add it to your event.</ThemedText>}
        <View style={styles.actions}>
          <Pressable style={styles.clear} onPress={() => setDraft(null)} disabled={!draft}><ThemedText style={styles.clearText}>Clear</ThemedText></Pressable>
          <Pressable style={styles.confirm} onPress={() => { onChange(draft); onClose(); }} disabled={!draft}><ThemedText style={styles.confirmText}>Select Location</ThemedText></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FC', paddingTop: 48 },
  header: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  title: { color: '#111A30', fontSize: 16, fontWeight: '700' },
  cancel: { color: '#087AC5', fontSize: 13, fontWeight: '600' },
  spacer: { width: 45 },
  searchBox: { margin: 16, height: 48, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#DCE5EF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  input: { flex: 1, marginLeft: 8, color: '#16213A', fontSize: 13 },
  suggestions: { backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 10, marginTop: -8, zIndex: 2 },
  suggestion: { flexDirection: 'row', alignItems: 'center', padding: 13, borderBottomWidth: 1, borderBottomColor: '#EEF3F8' },
  suggestionText: { flex: 1, color: '#16213A', marginLeft: 10, fontSize: 13 },
  error: { color: '#C0392B', marginHorizontal: 16, marginBottom: 8, fontSize: 12 },
  map: { flex: 1, minHeight: 260 },
  card: { backgroundColor: '#FFFFFF', padding: 16, margin: 16, borderRadius: 12, marginBottom: 8 },
  name: { color: '#111A30', fontWeight: '700', fontSize: 15 },
  address: { color: '#56708E', marginTop: 4, fontSize: 12 },
  empty: { color: '#56708E', textAlign: 'center', padding: 16 },
  actions: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#FFFFFF' },
  clear: { padding: 14, justifyContent: 'center' },
  clearText: { color: '#C0392B', fontWeight: '600' },
  confirm: { flex: 1, backgroundColor: '#087AC5', borderRadius: 10, alignItems: 'center', justifyContent: 'center', padding: 14 },
  confirmText: { color: '#FFFFFF', fontWeight: '700' },
});
