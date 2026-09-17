import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { createKickback } from '@/services/kickbackService';

export const vibeOptions = ['BBQ', 'Game On', 'Drinks', 'Bonfire', 'Chill', 'Pool', 'Music', 'Food', 'Other'] as const;
export const durationOptions = ['2 Hours', 'Tonight', 'Until Midnight', 'Custom'] as const;

type DurationOption = (typeof durationOptions)[number];

export function resolveExpiresAtUtc(duration: DurationOption): string {
  const now = new Date();

  if (duration === '2 Hours' || duration === 'Custom') {
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
  const { groupId: contextGroupId, memberId: contextMemberId } = useActiveGroupContext();
  const groupIdValue = String(groupId ?? contextGroupId ?? '');
  const memberIdValue = String(memberId ?? contextMemberId ?? '');

  const [selectedVibe, setSelectedVibe] = useState('');
  const [note, setNote] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>('2 Hours');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = groupIdValue.length > 0 && !loading;

  async function handleCreateKickback() {
    setError(null);
    if (selectedVibe.length === 0) {
      setError('Choose a vibe to continue.');
      return;
    }
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
        pathname: '/(tabs)/(main)/kickbacks',
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>Create a Kickback</ThemedText>
            <ThemedText style={styles.subtitle}>
              A quick way to get the family together. Pick a vibe and let&apos;s go.
            </ThemedText>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText style={styles.sectionTitle}>What&apos;s the vibe?</ThemedText>
            <View style={styles.buttonGrid}>
              {vibeOptions.map((vibe) => {
                const selected = selectedVibe === vibe;
                return (
                  <Pressable
                    key={vibe}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${vibe} vibe`}
                    style={[styles.choiceButton, selected && styles.choiceButtonSelected]}
                    onPress={() => {
                      setSelectedVibe(vibe);
                      setError(null);
                    }}>
                    <ThemedText style={[styles.choiceButtonText, selected && styles.choiceButtonTextSelected]}>
                      {vibe}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText style={styles.sectionTitle}>Add a note <ThemedText style={styles.optional}>Optional</ThemedText></ThemedText>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="What should everyone know?"
              placeholderTextColor="#8CA0B8"
              multiline
              maxLength={500}
              textAlignVertical="top"
              accessibilityLabel="Optional note"
            />
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText style={styles.sectionTitle}>How long?</ThemedText>
            <View style={styles.durationGroup}>
              {durationOptions.map((duration) => {
                const selected = selectedDuration === duration;
                return (
                  <Pressable
                    key={duration}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${duration} duration`}
                    style={[styles.durationButton, selected && styles.durationButtonSelected]}
                    onPress={() => setSelectedDuration(duration)}>
                    <ThemedText style={[styles.durationButtonText, selected && styles.durationButtonTextSelected]}>
                      {duration}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error !== null && <ThemedText accessibilityLiveRegion="polite" style={styles.feedbackError}>{error}</ThemedText>}

          <Pressable
            style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
            onPress={handleCreateKickback}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Create Kickback">
            {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.primaryButtonText}>Create Kickback</ThemedText>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F8FC' },
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 36, gap: 28 },
  header: { gap: 8 },
  title: { color: '#111A30', fontSize: 28, lineHeight: 34 },
  subtitle: { color: '#56708E', fontSize: 15, lineHeight: 22 },
  fieldGroup: { gap: 12 },
  sectionTitle: { color: '#111A30', fontSize: 17, fontWeight: '700' },
  optional: { color: '#8CA0B8', fontSize: 13, fontWeight: '400' },
  buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choiceButton: {
    minWidth: '29%',
    borderWidth: 1,
    borderColor: '#D3DFEC',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  choiceButtonSelected: { backgroundColor: '#087AC5', borderColor: '#087AC5' },
  choiceButtonText: { color: '#45617F', fontSize: 14, fontWeight: '600' },
  choiceButtonTextSelected: { color: '#FFFFFF' },
  input: {
    borderWidth: 1,
    borderColor: '#D3DFEC',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 14,
    fontSize: 15,
    minHeight: 94,
    color: '#111A30',
  },
  durationGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  durationButton: {
    flex: 1,
    minWidth: '44%',
    borderWidth: 1,
    borderColor: '#D3DFEC',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    alignItems: 'center',
  },
  durationButtonSelected: { backgroundColor: '#E6F3FB', borderColor: '#087AC5', borderWidth: 2 },
  durationButtonText: { color: '#45617F', fontSize: 14, fontWeight: '600' },
  durationButtonTextSelected: { color: '#087AC5' },
  feedbackError: { color: '#C0392B', fontSize: 14 },
  primaryButton: {
    backgroundColor: '#087AC5',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
