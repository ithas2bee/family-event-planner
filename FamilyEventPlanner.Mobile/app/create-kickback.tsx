import { router, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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

export function resolveExpiresAtUtc(duration: DurationOption, customHours = 2): string {
  const now = new Date();

  if (duration === '2 Hours' || duration === 'Custom') {
    const hours = duration === 'Custom' && customHours > 0 ? customHours : 2;
    return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
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
  const [customHours, setCustomHours] = useState('2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = selectedVibe.trim().length > 0 && groupIdValue.length > 0 && !loading;

  async function handleCreateKickback() {
    setError(null);

    if (selectedVibe.trim().length === 0) {
      setError('Choose a vibe to continue.');
      return;
    }

    if (groupIdValue.length === 0) {
      setError('Group not found.');
      return;
    }

    setLoading(true);

    try {
      await createKickback({
        familyGroupId: groupIdValue,
        vibe: selectedVibe,
        note: note.trim() || undefined,
        expiresAtUtc: resolveExpiresAtUtc(selectedDuration, Number(customHours)),
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={24} color="#17345D" />
            </Pressable>
            <View style={styles.headerIcon}>
              <ThemedText style={styles.headerIconText}>✦</ThemedText>
            </View>
            <View style={styles.headerCopy}>
              <ThemedText style={styles.eyebrow}>MAKE IT HAPPEN</ThemedText>
              <ThemedText style={styles.title}>Create a Kickback</ThemedText>
              <ThemedText style={styles.subtitle}>
                Something spontaneous for the family, without the fuss.
              </ThemedText>
            </View>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>What&apos;s the vibe?</ThemedText>
            <ThemedText style={styles.sectionHint}>Pick one to get the family excited.</ThemedText>
            <View style={styles.vibeGrid}>
              {vibeOptions.map((vibe) => {
                const isSelected = selectedVibe === vibe;
                return (
                  <Pressable
                    key={vibe}
                    style={[styles.vibeButton, isSelected && styles.selectedButton]}
                    onPress={() => setSelectedVibe(vibe)}
                    accessibilityRole="button"
                    accessibilityLabel={`Vibe: ${vibe}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <ThemedText style={[styles.vibeText, isSelected && styles.selectedButtonText]}>
                      {vibe}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <ThemedText style={styles.sectionTitle}>Add a note</ThemedText>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Anything the family should know? (optional)"
              placeholderTextColor="#8CA0B8"
              multiline
              maxLength={200}
              textAlignVertical="top"
              accessibilityLabel="Optional note"
            />

            <ThemedText style={styles.sectionTitle}>How long?</ThemedText>
            <View style={styles.durationGrid}>
              {durationOptions.map((duration) => {
                const isSelected = selectedDuration === duration;
                return (
                  <Pressable
                    key={duration}
                    style={[styles.durationButton, isSelected && styles.selectedButton]}
                    onPress={() => setSelectedDuration(duration)}
                    accessibilityRole="button"
                    accessibilityLabel={`Duration: ${duration}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <ThemedText style={[styles.durationText, isSelected && styles.selectedButtonText]}>
                      {duration}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            {selectedDuration === 'Custom' && (
              <View style={styles.customDurationRow}>
                <TextInput
                  style={styles.customDurationInput}
                  value={customHours}
                  onChangeText={setCustomHours}
                  keyboardType="number-pad"
                  maxLength={2}
                  accessibilityLabel="Custom duration in hours"
                />
                <ThemedText style={styles.customDurationLabel}>hours from now</ThemedText>
              </View>
            )}
          </View>

          {error !== null && <ThemedText style={styles.errorMessage}>{error}</ThemedText>}
          <Pressable
            style={[styles.primaryButton, !canSubmit && styles.disabledButton]}
            onPress={handleCreateKickback}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Create Kickback"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.primaryButtonText}>Create Kickback</ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F8FC' },
  flex: { flex: 1 },
  container: { padding: 20, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF2F6' },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#E5F5F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: { color: '#0A7EA4', fontSize: 28, fontWeight: '700' },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: { color: '#0A7EA4', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#162B45', fontSize: 30, fontWeight: '800', lineHeight: 36 },
  subtitle: { color: '#64748B', fontSize: 15, lineHeight: 21 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    gap: 12,
    shadowColor: '#183B56',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  sectionTitle: { color: '#162B45', fontSize: 18, fontWeight: '700', marginTop: 4 },
  sectionHint: { color: '#64748B', fontSize: 14, marginTop: -7 },
  vibeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 8 },
  vibeButton: {
    borderWidth: 1,
    borderColor: '#D8E2EC',
    borderRadius: 13,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: '#FBFCFE',
  },
  selectedButton: { backgroundColor: '#0A7EA4', borderColor: '#0A7EA4' },
  vibeText: { color: '#3B536D', fontSize: 15, fontWeight: '600' },
  selectedButtonText: { color: '#FFFFFF' },
  noteInput: {
    minHeight: 82,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    borderRadius: 13,
    padding: 13,
    color: '#162B45',
    fontSize: 15,
    backgroundColor: '#FBFCFE',
  },
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  durationButton: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8E2EC',
    borderRadius: 13,
    paddingVertical: 13,
    backgroundColor: '#FBFCFE',
  },
  durationText: { color: '#3B536D', fontSize: 15, fontWeight: '600' },
  customDurationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customDurationInput: {
    width: 58,
    borderWidth: 1,
    borderColor: '#D8E2EC',
    borderRadius: 10,
    padding: 10,
    color: '#162B45',
    textAlign: 'center',
    fontSize: 16,
  },
  customDurationLabel: { color: '#64748B', fontSize: 14 },
  errorMessage: { color: '#B42318', fontSize: 14, textAlign: 'center' },
  primaryButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#0A7EA4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A7EA4',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  disabledButton: { opacity: 0.5 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
