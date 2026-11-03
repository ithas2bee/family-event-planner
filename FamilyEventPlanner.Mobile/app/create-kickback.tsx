import { router, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
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
import { createKickback, getKickbacksByGroup, updateKickback, type Kickback } from '@/services/kickbackService';

export const vibeOptions = ['BBQ', 'Game On', 'Drinks', 'Bonfire', 'Chill', 'Pool', 'Music', 'Food', 'Other'] as const;
export const durationOptions = ['2 Hours', '4–6 Hours', 'Tonight', 'Until Midnight'] as const;

const vibeIcons: Record<(typeof vibeOptions)[number], keyof typeof MaterialIcons.glyphMap> = {
  BBQ: 'outdoor-grill',
  'Game On': 'sports-esports',
  Drinks: 'local-bar',
  Bonfire: 'local-fire-department',
  Chill: 'weekend',
  Pool: 'pool',
  Music: 'music-note',
  Food: 'restaurant',
  Other: 'more-horiz',
};

const vibeColors: Record<(typeof vibeOptions)[number], string> = {
  BBQ: '#E94764',
  'Game On': '#8B57E8',
  Drinks: '#F3A52B',
  Bonfire: '#F16B37',
  Chill: '#28A970',
  Pool: '#24A9D6',
  Music: '#E94764',
  Food: '#F3A52B',
  Other: '#617894',
};

type DurationOption = (typeof durationOptions)[number];

export function resolveExpiresAtUtc(duration: DurationOption): string {
  const now = new Date();

  if (duration === '2 Hours' || duration === '4–6 Hours') {
    const hours = duration === '2 Hours' ? 2 : 6;
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
  const { groupId, memberId, kickbackId } = useLocalSearchParams<{
    groupId: string;
    memberId: string;
    kickbackId?: string;
  }>();
  const { groupId: contextGroupId, memberId: contextMemberId } = useActiveGroupContext();
  const groupIdValue = String(groupId ?? contextGroupId ?? '');
  const memberIdValue = String(memberId ?? contextMemberId ?? '');
  const kickbackIdValue = String(kickbackId ?? '');
  const isEditing = kickbackIdValue.length > 0;

  const [selectedVibe, setSelectedVibe] = useState('');
  const [note, setNote] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<DurationOption | null>(
    isEditing ? null : '2 Hours',
  );
  const [existingKickback, setExistingKickback] = useState<Kickback | null>(null);
  const [loadingKickback, setLoadingKickback] = useState(isEditing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;

    async function loadKickback() {
      setLoadingKickback(true);
      try {
        const kickbacks = await getKickbacksByGroup(groupIdValue);
        const kickback = kickbacks.find((item) => item.id === kickbackIdValue);
        if (!kickback) throw new Error('Kickback not found.');
        if (!cancelled) {
          setExistingKickback(kickback);
          setSelectedVibe(kickback.vibe);
          setNote(kickback.note ?? '');
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load kickback.');
      } finally {
        if (!cancelled) setLoadingKickback(false);
      }
    }

    void loadKickback();
    return () => {
      cancelled = true;
    };
  }, [groupIdValue, isEditing, kickbackIdValue]);

  const canSubmit =
    selectedVibe.trim().length > 0 && groupIdValue.length > 0 && !loading && !loadingKickback;

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
      const updatedFields = {
        vibe: selectedVibe,
        note: note.trim() || undefined,
        expiresAtUtc:
          selectedDuration !== null
            ? resolveExpiresAtUtc(selectedDuration)
            : existingKickback?.expiresAtUtc ?? resolveExpiresAtUtc('2 Hours'),
      };

      if (isEditing) {
        if (!existingKickback) throw new Error('Kickback not found.');
        await updateKickback(kickbackIdValue, updatedFields);
      } else {
        await createKickback({ familyGroupId: groupIdValue, ...updatedFields });
      }

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

  if (loadingKickback) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#237AF1" />
        </View>
      </SafeAreaView>
    );
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
            <View style={styles.headerCopy}>
              <ThemedText style={styles.eyebrow}>MAKE IT HAPPEN</ThemedText>
              <ThemedText style={styles.title}>{isEditing ? 'Edit Kickback' : 'Create a Kickback'}</ThemedText>
              <ThemedText style={styles.subtitle}>
                {isEditing ? 'Update the details of your current kickback.' : 'Something spontaneous for your community, without the fuss.'}
              </ThemedText>
              <View style={styles.nowBadge}>
                <MaterialIcons name="bolt" size={15} color="#21865B" />
                <ThemedText style={styles.nowBadgeText}>Happening now</ThemedText>
              </View>
            </View>
            <View style={styles.gatheringIllustration} accessible={false}>
              <MaterialIcons name="auto-awesome" size={13} color="#E58A2B" style={styles.sparkle} />
              <View style={styles.gatheringPeople}>
                <View style={styles.person}>
                  <View style={[styles.personHead, styles.bluePerson]} />
                  <View style={[styles.personBody, styles.bluePerson]} />
                </View>
                <View style={styles.person}>
                  <View style={[styles.personHead, styles.pinkPerson]} />
                  <View style={[styles.personBody, styles.pinkPerson]} />
                </View>
                <View style={styles.person}>
                  <View style={[styles.personHead, styles.orangePerson]} />
                  <View style={[styles.personBody, styles.orangePerson]} />
                </View>
              </View>
              <View style={styles.gatheringTable} />
              <View style={styles.tableLegs}>
                <View style={[styles.tableLeg, styles.leftLeg]} />
                <View style={[styles.tableLeg, styles.rightLeg]} />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, styles.vibeIcon]}>
                <MaterialIcons name="auto-awesome" size={22} color="#E94764" />
              </View>
              <View style={styles.sectionCopy}>
                <ThemedText style={styles.sectionTitle}>What&apos;s the vibe?</ThemedText>
                <ThemedText style={styles.sectionHint}>Pick one to get your community excited.</ThemedText>
              </View>
            </View>
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
                    <MaterialIcons
                      name={vibeIcons[vibe]}
                      size={21}
                      color={isSelected ? '#1677E8' : vibeColors[vibe]}
                    />
                    <ThemedText style={[styles.vibeText, isSelected && styles.selectedButtonText]}>
                      {vibe}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, styles.noteIcon]}>
                <MaterialIcons name="sticky-note-2" size={22} color="#E94764" />
              </View>
              <View style={styles.sectionCopy}>
                <ThemedText style={styles.sectionTitle}>Add a note (optional)</ThemedText>
                <ThemedText style={styles.sectionHint}>Anything the community should know?</ThemedText>
              </View>
            </View>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="E.g., Bring a chair, snacks provided, etc."
              placeholderTextColor="#8CA0B8"
              multiline
              maxLength={200}
              textAlignVertical="top"
              accessibilityLabel="Optional note"
            />
            <ThemedText style={styles.noteCounter}>{note.length}/200</ThemedText>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, styles.durationIcon]}>
                <MaterialIcons name="schedule" size={23} color="#1677E8" />
              </View>
              <View style={styles.sectionCopy}>
                <ThemedText style={styles.sectionTitle}>How long?</ThemedText>
                <ThemedText style={styles.sectionHint}>Choose a duration for your kickback.</ThemedText>
              </View>
            </View>
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
                    <MaterialIcons
                      name={duration === 'Tonight' || duration === 'Until Midnight' ? 'nightlight-round' : 'schedule'}
                      size={21}
                      color={isSelected ? '#1677E8' : '#3B536D'}
                    />
                    <ThemedText style={[styles.durationText, isSelected && styles.selectedButtonText]}>
                      {duration}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error !== null && <ThemedText style={styles.errorMessage}>{error}</ThemedText>}
          <Pressable
            style={[styles.primaryButton, !canSubmit && styles.disabledButton]}
            onPress={handleCreateKickback}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel={isEditing ? 'Save Kickback' : 'Create Kickback'}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.primaryButtonContent}>
                <ThemedText style={styles.primaryButtonText}>{isEditing ? 'Save Changes' : 'Create Kickback'}</ThemedText>
                <MaterialIcons name="arrow-forward" size={21} color="#FFFFFF" />
              </View>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F8FC' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  container: { padding: 18, paddingBottom: 26, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF2F6' },
  headerCopy: { flex: 1, gap: 3 },
  eyebrow: { color: '#087FA7', fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: '#112953', fontSize: 27, fontWeight: '800', lineHeight: 32, letterSpacing: -0.5 },
  subtitle: { color: '#647895', fontSize: 14, lineHeight: 19 },
  nowBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    backgroundColor: '#E8F6EE',
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: 5,
  },
  nowBadgeText: { color: '#21865B', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  gatheringIllustration: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#FDEAF0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 1,
  },
  sparkle: { position: 'absolute', top: 13, right: 12 },
  gatheringPeople: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8, zIndex: 1 },
  person: { alignItems: 'center', marginHorizontal: -2 },
  personHead: { width: 14, height: 14, borderRadius: 7 },
  personBody: { width: 22, height: 18, borderRadius: 11, marginTop: -1 },
  bluePerson: { backgroundColor: '#4387D7' },
  pinkPerson: { backgroundColor: '#E95570' },
  orangePerson: { backgroundColor: '#F3A52B' },
  gatheringTable: { position: 'absolute', top: 49, width: 53, height: 6, borderRadius: 3, backgroundColor: '#31557F' },
  tableLegs: { position: 'absolute', top: 54, width: 39, flexDirection: 'row', justifyContent: 'space-between' },
  tableLeg: { width: 4, height: 13, borderRadius: 2, backgroundColor: '#31557F' },
  leftLeg: { transform: [{ rotate: '18deg' }] },
  rightLeg: { transform: [{ rotate: '-18deg' }] },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    gap: 14,
    shadowColor: '#183B56',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibeIcon: { backgroundColor: '#FCEEF2' },
  noteIcon: { backgroundColor: '#FCEEF2' },
  durationIcon: { backgroundColor: '#EAF3FF' },
  sectionCopy: { flex: 1, gap: 2 },
  sectionTitle: { color: '#112953', fontSize: 17, lineHeight: 22, fontWeight: '800' },
  sectionHint: { color: '#6C809D', fontSize: 13, lineHeight: 18 },
  vibeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  vibeButton: {
    width: '31.5%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#E0E9F3',
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 5,
    backgroundColor: '#FBFCFE',
  },
  selectedButton: { backgroundColor: '#EAF3FF', borderColor: '#2581F6', borderWidth: 1.5 },
  vibeText: { color: '#405979', fontSize: 12, fontWeight: '700', lineHeight: 16 },
  selectedButtonText: { color: '#164A92' },
  noteInput: {
    minHeight: 94,
    borderWidth: 1,
    borderColor: '#D7E2EF',
    borderRadius: 18,
    padding: 15,
    color: '#172F57',
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: '#FFFFFF',
  },
  noteCounter: { color: '#8999AE', fontSize: 12, lineHeight: 16, textAlign: 'right', marginTop: -8 },
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationButton: {
    width: '48%',
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0E9F3',
    borderRadius: 16,
    paddingVertical: 11,
    backgroundColor: '#FBFCFE',
  },
  durationText: { color: '#304B6D', fontSize: 13, fontWeight: '700' },
  errorMessage: { color: '#B42318', fontSize: 14, textAlign: 'center' },
  primaryButton: {
    minHeight: 60,
    borderRadius: 20,
    backgroundColor: '#237AF1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#237AF1',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  disabledButton: { opacity: 0.5 },
  primaryButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, lineHeight: 22, fontWeight: '800' },
});
