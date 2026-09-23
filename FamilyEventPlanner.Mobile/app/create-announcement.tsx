import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
import { createAnnouncement } from '@/services/announcementService';

export default function CreateAnnouncementScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { groupId: contextGroupId } = useActiveGroupContext();
  const groupIdValue = String(groupId ?? contextGroupId ?? '');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [durationHours, setDurationHours] = useState<number | null>(null);
  const [durationPickerVisible, setDurationPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const durationOptions = [
    { hours: 1, label: '1 hour' },
    { hours: 6, label: '6 hours' },
    { hours: 24, label: '1 day' },
    { hours: 72, label: '3 days' },
    { hours: 168, label: '7 days' },
  ];
  const selectedDurationLabel =
    durationOptions.find((option) => option.hours === durationHours)?.label ?? 'No end date';

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && groupIdValue.length > 0;

  async function handleCreateAnnouncement() {
    setError(null);
    setLoading(true);

    try {
      if (groupIdValue.length === 0) {
        throw new Error('Group not found.');
      }

      await createAnnouncement({
        familyGroupId: groupIdValue,
        title: title.trim(),
        body: body.trim(),
        durationHours: durationHours ?? undefined,
      });

      router.replace({
        pathname: '/(tabs)/(main)/announcements',
        params: {
          groupId: groupIdValue,
          refreshToken: Date.now().toString(),
        },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create announcement.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8}>
              <MaterialIcons name="arrow-back" size={28} color="#111A30" />
            </Pressable>
            <ThemedText style={styles.topBarTitle}>Create Announcement</ThemedText>
            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <ThemedText style={styles.title}>Create an Announcement</ThemedText>
              <ThemedText style={styles.subtitle}>Share important news with your family. ❤️</ThemedText>
            </View>
            <View style={styles.heroIcon} accessible accessibilityLabel="Announcement">
              <MaterialIcons name="campaign" size={48} color="#E52D50" />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldSection}>
              <View style={[styles.fieldIcon, styles.titleIcon]}>
                <ThemedText style={styles.titleIconText}>T</ThemedText>
              </View>
              <View style={styles.fieldContent}>
                <ThemedText style={styles.sectionTitle}>
                  Title <ThemedText style={styles.required}>*</ThemedText>
                </ThemedText>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Enter announcement title..."
                    placeholderTextColor="#8392AA"
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={200}
                    accessibilityLabel="Title"
                  />
                  <ThemedText style={styles.counter}>{title.length}/200</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldSection}>
              <View style={[styles.fieldIcon, styles.bodyIcon]}>
                <MaterialIcons name="description" size={28} color="#D7284C" />
              </View>
              <View style={styles.fieldContent}>
                <ThemedText style={styles.sectionTitle}>
                  Body <ThemedText style={styles.required}>*</ThemedText>
                </ThemedText>
                <TextInput
                  style={[styles.input, styles.bodyInput]}
                  value={body}
                  onChangeText={setBody}
                  placeholder="Enter announcement body..."
                  placeholderTextColor="#8392AA"
                  multiline
                  textAlignVertical="top"
                  accessibilityLabel="Body"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldSection}>
              <View style={[styles.fieldIcon, styles.dateIcon]}>
                <MaterialIcons name="event" size={27} color="#D7284C" />
              </View>
              <View style={styles.fieldContent}>
                <ThemedText style={styles.sectionTitle}>Expires At (Optional)</ThemedText>
                <ThemedText style={styles.fieldHint}>
                  Set when this announcement should no longer be shown.
                </ThemedText>
                <Pressable
                  style={styles.expirationInput}
                  onPress={() => setDurationPickerVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Expires At"
                >
                  <ThemedText style={styles.expirationText}>{selectedDurationLabel}</ThemedText>
                  <MaterialIcons name="expand-more" size={23} color="#162B45" />
                </Pressable>
              </View>
            </View>
          </View>

          <Modal
            visible={durationPickerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setDurationPickerVisible(false)}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setDurationPickerVisible(false)}>
              <Pressable style={styles.durationPicker} onPress={(event) => event.stopPropagation()}>
                <ThemedText style={styles.durationPickerTitle}>Expires At</ThemedText>
                <ThemedText style={styles.durationPickerHint}>Choose when this announcement expires.</ThemedText>
                <Pressable
                  style={[styles.durationOption, durationHours === null && styles.selectedDurationOption]}
                  onPress={() => {
                    setDurationHours(null);
                    setDurationPickerVisible(false);
                  }}
                >
                  <ThemedText style={styles.durationOptionText}>No expiration</ThemedText>
                  {durationHours === null && <MaterialIcons name="check" size={22} color="#D7284C" />}
                </Pressable>
                {durationOptions.map((option) => (
                  <Pressable
                    key={option.hours}
                    style={[styles.durationOption, durationHours === option.hours && styles.selectedDurationOption]}
                    onPress={() => {
                      setDurationHours(option.hours);
                      setDurationPickerVisible(false);
                    }}
                  >
                    <ThemedText style={styles.durationOptionText}>{option.label}</ThemedText>
                    {durationHours === option.hours && <MaterialIcons name="check" size={22} color="#D7284C" />}
                  </Pressable>
                ))}
              </Pressable>
            </Pressable>
          </Modal>

          {error !== null && <ThemedText style={styles.errorMessage}>{error}</ThemedText>}

          <Pressable
            style={[styles.primaryButton, (!canSubmit || loading) && styles.disabledButton]}
            onPress={handleCreateAnnouncement}
            disabled={!canSubmit || loading}
            accessibilityRole="button"
            accessibilityLabel="Create Announcement"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="campaign" size={26} color="#FFFFFF" />
                <ThemedText style={styles.primaryButtonText}>Create Announcement</ThemedText>
              </>
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
  container: { paddingHorizontal: 16, paddingBottom: 30, gap: 18 },
  topBar: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topBarTitle: { color: '#111A30', fontSize: 16, fontWeight: '700' },
  topBarSpacer: { width: 28 },
  hero: { minHeight: 145, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  heroCopy: { flex: 1, paddingRight: 8 },
  title: { color: '#111A30', fontSize: 36, lineHeight: 43, fontWeight: '800' },
  subtitle: { color: '#687B98', fontSize: 16, lineHeight: 23, marginTop: 5 },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FDE8EE',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    gap: 18,
    shadowColor: '#203B5A',
    shadowOpacity: 0.06,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  fieldSection: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  fieldIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  titleIcon: { backgroundColor: '#FDE8EE' },
  bodyIcon: { backgroundColor: '#FDE8EE' },
  dateIcon: { backgroundColor: '#FDE8EE' },
  titleIconText: { color: '#D7284C', fontSize: 34, fontFamily: 'serif', fontWeight: '700' },
  fieldContent: { flex: 1, gap: 8 },
  sectionTitle: { color: '#111A30', fontSize: 20, fontWeight: '700' },
  required: { color: '#E33B43' },
  fieldHint: { color: '#687B98', fontSize: 14, lineHeight: 20, marginTop: -3 },
  inputWrap: { position: 'relative' },
  input: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#D2DCE9',
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingBottom: 25,
    color: '#16213A',
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  bodyInput: { minHeight: 130, paddingTop: 14, paddingBottom: 30 },
  counter: { position: 'absolute', right: 12, bottom: 9, color: '#687B98', fontSize: 13 },
  expirationInput: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#D2DCE9',
    borderRadius: 15,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expirationText: { flex: 1, color: '#16213A', fontSize: 16, paddingVertical: 0 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 26, 48, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  durationPicker: { width: '100%', maxWidth: 420, borderRadius: 20, padding: 20, backgroundColor: '#FFFFFF' },
  durationPickerTitle: { color: '#111A30', fontSize: 21, fontWeight: '700' },
  durationPickerHint: { color: '#687B98', fontSize: 14, marginTop: 5, marginBottom: 10 },
  durationOption: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedDurationOption: { backgroundColor: '#FDE8EE' },
  durationOptionText: { color: '#16213A', fontSize: 16 },
  divider: { height: 1, backgroundColor: '#E8EDF4' },
  errorMessage: { color: '#B42318', fontSize: 14, textAlign: 'center', marginTop: -7 },
  primaryButton: {
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: '#F52F55',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#F52F55',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  disabledButton: { opacity: 0.5 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});
