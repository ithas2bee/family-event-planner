import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { createEvent } from '@/services/eventService';
import { EventHeroSection } from '@/components/events/EventHeroSection';
import { EventDetailsCard } from '@/components/events/EventDetailsCard';
import { EventDateModal } from '@/components/events/EventDateModal';
import { EventLocationModal } from '@/components/events/EventLocationModal';
import { EventSettingsModal } from '@/components/events/EventSettingsModal';

export default function CreateEventScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { groupId: contextGroupId } = useActiveGroupContext();
  const groupIdValue = String(groupId ?? contextGroupId ?? '');

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [description, setDescription] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [dressCode, setDressCode] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  // Date objects for modal
  const [dateObj, setDateObj] = useState<Date | null>(null);
  const [endDateObj, setEndDateObj] = useState<Date | null>(null);

  // Sync string <-> date
  function handleDateChange(newDate: Date | null, newEndDate: Date | null) {
    setDateObj(newDate);
    setEndDateObj(newEndDate);
    setStartDate(newDate ? newDate.toISOString() : '');
    setEndDate(newEndDate ? newEndDate.toISOString() : '');
  }

  function handleLocationChange(newLocation: string) {
    setLocation(newLocation);
  }

  function handleSettingsChange(newDressCode: string, newNotes: string) {
    setDressCode(newDressCode);
    setNotes(newNotes);
  }

  const canSubmit = title.trim().length > 0 && startDate.trim().length > 0 && groupIdValue.length > 0;

  async function handleCreateEvent() {
    setError(null);
    setLoading(true);
    try {
      if (groupIdValue.length === 0) {
        throw new Error('Group not found.');
      }
      await createEvent({
        familyGroupId: groupIdValue,
        title: title.trim(),
        startDate: startDate.trim(),
        description: description.trim() || undefined,
        endDate: endDate.trim() || undefined,
        location: location.trim() || undefined,
        dressCode: dressCode.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      router.replace({
        pathname: '/(tabs)/(main)/events',
        params: {
          groupId: groupIdValue,
          refreshToken: Date.now().toString(),
        },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create event.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: '#101018' }} contentContainerStyle={{ flexGrow: 1 }}>
        <EventHeroSection title={title || 'Create Event'}>
          <TextInput
            style={styles.heroInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Event Title"
            placeholderTextColor="#ccc"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={60}
          />
        </EventHeroSection>
        <View style={{ height: 12 }} />
        <EventDetailsCard
          title={title}
          date={startDate ? new Date(startDate).toLocaleString() : ''}
          location={location}
          onPressDate={() => setDateModalVisible(true)}
          onPressLocation={() => setLocationModalVisible(true)}
          onPressSettings={() => setSettingsModalVisible(true)}
        />
        <View style={styles.cardSection}>
          <ThemedText type="defaultSemiBold" style={styles.label}>Description</ThemedText>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional description"
            multiline
            maxLength={200}
          />
        </View>
        <Pressable
          style={[styles.primaryButton, (!canSubmit || loading) && styles.buttonDisabled]}
          onPress={handleCreateEvent}
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
              Create Event
            </ThemedText>
          )}
        </Pressable>
        {error !== null ? <ThemedText style={styles.feedbackError}>{error}</ThemedText> : null}
      </ScrollView>
      <EventDateModal
        visible={dateModalVisible}
        date={dateObj}
        endDate={endDateObj}
        onChange={handleDateChange}
        onClose={() => setDateModalVisible(false)}
      />
      <EventLocationModal
        visible={locationModalVisible}
        location={location}
        onChange={handleLocationChange}
        onClose={() => setLocationModalVisible(false)}
      />
      <EventSettingsModal
        visible={settingsModalVisible}
        dressCode={dressCode}
        notes={notes}
        onChange={handleSettingsChange}
        onClose={() => setSettingsModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  heroInput: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSection: {
    backgroundColor: 'rgba(30,30,40,0.92)',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  label: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 2,
  },
  input: {
    backgroundColor: '#18181f',
    color: '#fff',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 8,
    fontSize: 16,
  },
  primaryButton: {
    marginTop: 18,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#0A7EA4',
    marginHorizontal: 32,
    marginBottom: 24,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  feedbackError: {
    color: '#C0392B',
    textAlign: 'center',
    fontSize: 15,
    marginTop: 10,
  },
});