import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createKickback } from '@/services/kickbackService';

const vibeOptions = ['BBQ', 'Game On', 'Drinks', 'Bonfire', 'Chill', 'Pool', 'Music', 'Food'];
const durationOptions = ['2 Hours', 'Tonight', 'Until Midnight'] as const;

type DurationOption = (typeof durationOptions)[number];

function resolveExpiresAtUtc(duration: DurationOption): string {
  const now = new Date();

  if (duration === '2 Hours') {
    return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  }

  const target = new Date(now);
  target.setHours(duration === 'Tonight' ? 22 : 23, duration === 'Tonight' ? 0 : 59, 0, 0);

  if (target.getTime() <= now.getTime()) {
    return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  }

  return target.toISOString();
}

export default function CreateKickbackScreen() {
  const { groupId, memberId } = useLocalSearchParams<{ groupId: string; memberId: string }>();
  const groupIdValue = String(groupId ?? '');
  const memberIdValue = String(memberId ?? '');

  const [selectedVibe, setSelectedVibe] = useState('');
  const [note, setNote] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>('2 Hours');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = selectedVibe.trim().length > 0 && groupIdValue.length > 0 && !loading;

  async function handleCreateKickback() {
    setError(null);
    setLoading(true);

    try {
      if (groupIdValue.length === 0) {
        throw new Error('Group not found.');
      }

      await createKickback({
        familyGroupId: groupIdValue,
        vibe: selectedVibe,
        note: note.trim() || undefined,
        expiresAtUtc: resolveExpiresAtUtc(selectedDuration),
      });

      router.replace({
        pathname: '/kickbacks',
        params: {
          groupId: groupIdValue,
          memberId: memberIdValue,
          refreshToken: Date.now().toString(),
        },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create kickback.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Create Kickback
      </ThemedText>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Vibe
        </ThemedText>
        <View style={styles.buttonGrid}>
          {vibeOptions.map((vibe) => (
            <Pressable
              key={vibe}
              style={[styles.choiceButton, selectedVibe === vibe && styles.choiceButtonSelected]}
              onPress={() => setSelectedVibe(vibe)}>
              <ThemedText
                type="defaultSemiBold"
                style={[
                  styles.choiceButtonText,
                  selectedVibe === vibe && styles.choiceButtonTextSelected,
                ]}>
                {vibe}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Note
        </ThemedText>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="Optional note"
          multiline
        />
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Duration
        </ThemedText>
        <View style={styles.durationGroup}>
          {durationOptions.map((duration) => (
            <Pressable
              key={duration}
              style={[
                styles.durationButton,
                selectedDuration === duration && styles.durationButtonSelected,
              ]}
              onPress={() => setSelectedDuration(duration)}>
              <ThemedText
                type="defaultSemiBold"
                style={[
                  styles.durationButtonText,
                  selectedDuration === duration && styles.durationButtonTextSelected,
                ]}>
                {duration}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </ThemedView>

      {error !== null && <ThemedText style={styles.feedbackError}>{error}</ThemedText>}

      <Pressable
        style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
        onPress={handleCreateKickback}
        disabled={!canSubmit}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
            Post Kickback
          </ThemedText>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  title: {
    marginBottom: 8,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    marginBottom: 4,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceButton: {
    borderWidth: 1,
    borderColor: '#0A7EA4',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  choiceButtonSelected: {
    backgroundColor: '#0A7EA4',
  },
  choiceButtonText: {
    color: '#0A7EA4',
  },
  choiceButtonTextSelected: {
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  durationGroup: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  durationButton: {
    borderWidth: 1,
    borderColor: '#0A7EA4',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  durationButtonSelected: {
    backgroundColor: '#0A7EA4',
  },
  durationButtonText: {
    color: '#0A7EA4',
  },
  durationButtonTextSelected: {
    color: '#FFFFFF',
  },
  feedbackError: {
    color: '#C0392B',
  },
  primaryButton: {
    backgroundColor: '#0A7EA4',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
