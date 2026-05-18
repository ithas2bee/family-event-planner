import { EventDateModal } from '@/components/events/EventDateModal';
import { EventDetailsCard } from '@/components/events/EventDetailsCard';
import { EventHeroSection } from '@/components/events/EventHeroSection';
import { EventLocationModal } from '@/components/events/EventLocationModal';
import { EventSettingsModal } from '@/components/events/EventSettingsModal';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Typography } from '@/components/ui/design-system';
import { FormInput } from '@/components/ui/form-input';
import { GlassCard } from '@/components/ui/glass-card';
import { ImmersiveButton } from '@/components/ui/immersive-button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { createEvent } from '@/services/eventService';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
    <ScreenContainer withKeyboardAvoid withScroll>
      <EventHeroSection title={title || 'Create Event'}>
        <FormInput
          variant="hero"
          value={title}
          onChangeText={setTitle}
          placeholder="Event Title"
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={60}
        />
      </EventHeroSection>
      <View style={styles.spacer} />
      <EventDetailsCard
        title={title}
        date={startDate ? new Date(startDate).toLocaleString() : ''}
        location={location}
        onPressDate={() => setDateModalVisible(true)}
        onPressLocation={() => setLocationModalVisible(true)}
        onPressSettings={() => setSettingsModalVisible(true)}
        showSettings={true}
      />
      <GlassCard style={styles.sectionCard}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Description
        </ThemedText>
        <FormInput
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description (max 200 characters)"
          multiline
          maxLength={200}
        />
      </GlassCard>

      <View style={styles.buttonContainer}>
        <ImmersiveButton
          variant="primary"
          size="large"
          disabled={!canSubmit || loading}
          onPress={handleCreateEvent}
        >
          {loading ? 'Creating...' : 'Create Event'}
        </ImmersiveButton>
      </View>

      {error !== null && (
        <ThemedText style={styles.errorMessage}>{error}</ThemedText>
      )}
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  spacer: {
    height: Spacing.md,
  },
  sectionCard: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.md,
  },
  buttonContainer: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xl,
  },
  errorMessage: {
    color: Colors.error,
    textAlign: 'center',
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
  },
});