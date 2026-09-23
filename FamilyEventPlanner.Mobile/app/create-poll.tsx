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
import { createPoll } from '@/services/pollService';

export default function CreatePollScreen() {
  const { groupId, memberId } = useLocalSearchParams<{ groupId: string; memberId: string }>();
  const { groupId: contextGroupId, memberId: contextMemberId } = useActiveGroupContext();
  const groupIdValue = String(groupId ?? contextGroupId ?? '');
  const memberIdValue = String(memberId ?? contextMemberId ?? '');

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationHours, setDurationHours] = useState<number | null>(null);
  const [durationPickerVisible, setDurationPickerVisible] = useState(false);

  const durationOptions = [
    { hours: 1, label: '1 hour' },
    { hours: 6, label: '6 hours' },
    { hours: 24, label: '1 day' },
    { hours: 72, label: '3 days' },
    { hours: 168, label: '7 days' },
  ];
  const selectedDurationLabel =
    durationOptions.find((option) => option.hours === durationHours)?.label ?? 'No end date';

  const filledOptions = options.filter((option) => option.trim().length > 0);
  const canSubmit =
    question.trim().length > 0 && filledOptions.length >= 2 && groupIdValue.length > 0 && !loading;

  function handleOptionChange(index: number, value: string) {
    setOptions((previous) => previous.map((option, optionIndex) => (optionIndex === index ? value : option)));
  }

  function handleAddOption() {
    setOptions((previous) => [...previous, '']);
  }

  function handleRemoveOption(index: number) {
    if (options.length <= 2) {
      return;
    }
    setOptions((previous) => previous.filter((_, optionIndex) => optionIndex !== index));
  }

  async function handleCreatePoll() {
    setError(null);

    if (question.trim().length === 0) {
      setError('Please enter a question.');
      return;
    }

    if (filledOptions.length < 2) {
      setError('Please enter at least 2 options.');
      return;
    }

    setLoading(true);
    try {
      if (groupIdValue.length === 0) {
        throw new Error('Group not found.');
      }

      await createPoll({
        familyGroupId: groupIdValue,
        question: question.trim(),
        options: filledOptions.map((option) => option.trim()),
        durationHours: durationHours ?? undefined,
      });

      router.replace({
        pathname: '/(tabs)/(main)/polls',
        params: {
          groupId: groupIdValue,
          memberId: memberIdValue,
          refreshToken: Date.now().toString(),
        },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create poll.');
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
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
              <MaterialIcons name="arrow-back" size={28} color="#111A30" />
            </Pressable>
            <ThemedText style={styles.topBarTitle}>Create Poll</ThemedText>
            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <ThemedText style={styles.title}>Create a Poll</ThemedText>
              <ThemedText style={styles.subtitle}>Get quick opinions from your family.</ThemedText>
            </View>
            <View style={styles.heroIcon} accessible accessibilityLabel="Poll">
              <MaterialIcons name="insert-chart" size={42} color="#6955E8" />
              <MaterialIcons name="chat-bubble" size={25} color="#79A7F7" style={styles.chatIcon} />
            </View>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>
              Question <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <View style={styles.questionInputWrap}>
              <TextInput
                style={styles.questionInput}
                value={question}
                onChangeText={setQuestion}
                placeholder="Enter your poll question..."
                placeholderTextColor="#8392AA"
                multiline
                maxLength={200}
                textAlignVertical="top"
                accessibilityLabel="Question"
              />
              <ThemedText style={styles.counter}>{question.length}/200</ThemedText>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>
                Options <ThemedText style={styles.required}>*</ThemedText>
              </ThemedText>
              <ThemedText style={styles.sectionHint}>At least 2 options required</ThemedText>
            </View>

            {options.map((option, index) => (
              <View key={index} style={styles.optionRow}>
                <MaterialIcons name="drag-indicator" size={25} color="#8392AA" />
                <TextInput
                  style={styles.optionInput}
                  value={option}
                  onChangeText={(value) => handleOptionChange(index, value)}
                  placeholder={`Option ${index + 1}`}
                  placeholderTextColor="#8392AA"
                  autoCorrect={false}
                  accessibilityLabel={`Option ${index + 1}`}
                />
                {options.length > 2 ? (
                  <Pressable
                    onPress={() => handleRemoveOption(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove option ${index + 1}`}
                    hitSlop={8}
                  >
                    <MaterialIcons name="close" size={27} color="#6E7F9B" />
                  </Pressable>
                ) : (
                  <View style={styles.removePlaceholder} />
                )}
              </View>
            ))}

            <Pressable
              style={styles.addButton}
              onPress={handleAddOption}
              accessibilityRole="button"
              accessibilityLabel="Add option"
            >
              <MaterialIcons name="add-circle-outline" size={26} color="#287FE5" />
              <ThemedText style={styles.addButtonText}>Add Option</ThemedText>
            </Pressable>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.settingsTitle}>Additional Settings (Optional)</ThemedText>
            <Pressable
              style={styles.settingRow}
              onPress={() => setDurationPickerVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Poll Duration"
            >
              <View style={[styles.settingIcon, styles.durationIcon]}>
                <MaterialIcons name="event" size={25} color="#6955E8" />
              </View>
              <View style={styles.settingCopy}>
                <ThemedText style={styles.settingLabel}>Poll Duration</ThemedText>
                <ThemedText style={styles.settingHint}>Set when voting ends.</ThemedText>
              </View>
              <View style={styles.settingValue}>
                <ThemedText style={styles.settingValueText}>{selectedDurationLabel}</ThemedText>
                <MaterialIcons name="expand-more" size={23} color="#162B45" />
              </View>
            </Pressable>
            <View style={styles.settingRow}>
              <View style={[styles.settingIcon, styles.notifyIcon]}>
                <MaterialIcons name="groups" size={25} color="#16834F" />
              </View>
              <View style={styles.settingCopy}>
                <ThemedText style={styles.settingLabel}>Notify Family</ThemedText>
                <ThemedText style={styles.settingHint}>Family activity updates are automatic.</ThemedText>
              </View>
              <View style={styles.toggle}>
                <View style={styles.toggleKnob} />
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
                <ThemedText style={styles.durationPickerTitle}>Poll Duration</ThemedText>
                <ThemedText style={styles.durationPickerHint}>Choose when voting ends.</ThemedText>
                <Pressable
                  style={[styles.durationOption, durationHours === null && styles.selectedDurationOption]}
                  onPress={() => {
                    setDurationHours(null);
                    setDurationPickerVisible(false);
                  }}
                >
                  <ThemedText style={styles.durationOptionText}>No end date</ThemedText>
                  {durationHours === null && <MaterialIcons name="check" size={22} color="#6955E8" />}
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
                    {durationHours === option.hours && <MaterialIcons name="check" size={22} color="#6955E8" />}
                  </Pressable>
                ))}
              </Pressable>
            </Pressable>
          </Modal>

          {error !== null && <ThemedText style={styles.errorMessage}>{error}</ThemedText>}

          <Pressable
            style={[styles.primaryButton, (!canSubmit || loading) && styles.disabledButton]}
            onPress={handleCreatePoll}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Create Poll"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="insert-chart" size={25} color="#FFFFFF" />
                <ThemedText style={styles.primaryButtonText}>Create Poll</ThemedText>
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
  hero: { minHeight: 130, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  heroCopy: { flex: 1 },
  title: { color: '#111A30', fontSize: 36, lineHeight: 43, fontWeight: '800' },
  subtitle: { color: '#687B98', fontSize: 16, lineHeight: 23, marginTop: 4 },
  heroIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '8deg' }],
  },
  chatIcon: { position: 'absolute', top: 8, right: 9 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2EAF4',
    padding: 20,
    gap: 14,
    shadowColor: '#203B5A',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: '#111A30', fontSize: 20, fontWeight: '700' },
  required: { color: '#E33B43' },
  sectionHint: { color: '#687B98', fontSize: 13 },
  questionInputWrap: { position: 'relative' },
  questionInput: {
    minHeight: 113,
    borderWidth: 1,
    borderColor: '#D2DCE9',
    borderRadius: 15,
    padding: 14,
    paddingBottom: 32,
    color: '#16213A',
    fontSize: 16,
  },
  counter: { position: 'absolute', right: 12, bottom: 10, color: '#687B98', fontSize: 13 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionInput: {
    flex: 1,
    minHeight: 57,
    borderWidth: 1,
    borderColor: '#D2DCE9',
    borderRadius: 15,
    paddingHorizontal: 14,
    color: '#16213A',
    fontSize: 16,
  },
  removePlaceholder: { width: 27 },
  addButton: {
    minHeight: 57,
    borderRadius: 15,
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  addButtonText: { color: '#287FE5', fontSize: 17, fontWeight: '700' },
  settingsTitle: { color: '#111A30', fontSize: 20, fontWeight: '700', marginBottom: 2 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  durationIcon: { backgroundColor: '#EDE9FF' },
  notifyIcon: { backgroundColor: '#DDF8EE' },
  settingCopy: { flex: 1 },
  settingLabel: { color: '#16213A', fontSize: 16, fontWeight: '600' },
  settingHint: { color: '#687B98', fontSize: 13, lineHeight: 18, marginTop: 2 },
  settingValue: {
    minHeight: 52,
    maxWidth: 145,
    borderWidth: 1,
    borderColor: '#D2DCE9',
    borderRadius: 15,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  settingValueText: { color: '#16213A', fontSize: 14, fontWeight: '600' },
  toggle: { width: 64, height: 36, borderRadius: 18, backgroundColor: '#2D82EC', padding: 4, justifyContent: 'center' },
  toggleKnob: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF', alignSelf: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(17, 26, 48, 0.35)', justifyContent: 'center', padding: 20 },
  durationPicker: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, gap: 8 },
  durationPickerTitle: { color: '#111A30', fontSize: 20, fontWeight: '700' },
  durationPickerHint: { color: '#687B98', fontSize: 14, marginBottom: 4 },
  durationOption: { minHeight: 48, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectedDurationOption: { backgroundColor: '#EDE9FF' },
  durationOptionText: { color: '#16213A', fontSize: 16, fontWeight: '600' },
  errorMessage: { color: '#B42318', fontSize: 14, textAlign: 'center', marginTop: -8 },
  primaryButton: {
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: '#6955E8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#6955E8',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  disabledButton: { opacity: 0.5 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});
