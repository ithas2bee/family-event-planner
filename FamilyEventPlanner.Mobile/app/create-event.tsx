import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createEvent } from '@/services/eventService';

export default function CreateEventScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const groupIdValue = String(groupId ?? '');

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [description, setDescription] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [dressCode, setDressCode] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        pathname: '/events',
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
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Create Event
      </ThemedText>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Title
        </ThemedText>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter event title"
          autoCapitalize="words"
          autoCorrect={false}
        />
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Start Date
        </ThemedText>
        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2026-05-06T18:00:00Z"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Description
        </ThemedText>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          multiline
        />
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          End Date
        </ThemedText>
        <TextInput
          style={styles.input}
          value={endDate}
          onChangeText={setEndDate}
          placeholder="Optional end date"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Location
        </ThemedText>
        <TextInput
          style={styles.input}
          value={location}
          onChangeText={setLocation}
          placeholder="Optional location"
          autoCapitalize="words"
          autoCorrect={false}
        />
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Dress Code
        </ThemedText>
        <TextInput
          style={styles.input}
          value={dressCode}
          onChangeText={setDressCode}
          placeholder="Optional dress code"
          autoCapitalize="words"
          autoCorrect={false}
        />
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Notes
        </ThemedText>
        <TextInput
          style={styles.input}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional notes"
          multiline
        />
      </ThemedView>

      <Pressable
        style={[styles.primaryButton, (!canSubmit || loading) && styles.buttonDisabled]}
        onPress={handleCreateEvent}
        disabled={!canSubmit || loading}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
            Create Event
          </ThemedText>
        )}
      </Pressable>

      {error !== null ? <ThemedText style={styles.feedbackError}>{error}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 14,
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
    marginBottom: 8,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#BCC3CC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  primaryButton: {
    marginTop: 6,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#0A7EA4',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  feedbackError: {
    color: '#C0392B',
    textAlign: 'center',
    fontSize: 14,
  },
});