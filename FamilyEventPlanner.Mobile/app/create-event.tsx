import { EventDateModal } from '@/components/events/EventDateModal';
import { EventLocationModal } from '@/components/events/EventLocationModal';
import { EventSettingsModal } from '@/components/events/EventSettingsModal';
import { ThemedText } from '@/components/themed-text';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { createEvent } from '@/services/eventService';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  const canSubmit = groupIdValue.length > 0;

  async function handleCreateEvent() {
    setError(null);
    if (title.trim().length === 0 || startDate.trim().length === 0) {
      setError('Add an event title and date to continue.');
      return;
    }
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

  const formattedDate = dateObj
    ? dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Select date';
  const formattedTime = dateObj
    ? dateObj.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : 'Select time';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Cancel">
              <ThemedText style={styles.cancel}>Cancel</ThemedText>
            </Pressable>
            <ThemedText style={styles.headerTitle}>Create Event</ThemedText>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.progress} accessibilityLabel="Step 1 of 4: Details">
            {['1', '2', '3', '4'].map((step, index) => (
              <View key={step} style={styles.progressItem}>
                <View style={[styles.stepCircle, index === 0 && styles.activeStep]}>
                  <ThemedText style={[styles.stepText, index === 0 && styles.activeStepText]}>{step}</ThemedText>
                </View>
                <ThemedText style={styles.stepLabel}>{['Details', 'Location', 'Settings', 'Review'][index]}</ThemedText>
              </View>
            ))}
          </View>

          <ThemedText style={styles.pageTitle}>Event Details</ThemedText>
          <ThemedText style={styles.subtitle}>Tell your family about the event</ThemedText>

          <View style={styles.formCard}>
            <ThemedText style={styles.label}>Event Title <ThemedText style={styles.required}>*</ThemedText></ThemedText>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Family Game Night"
              placeholderTextColor="#8CA0B8"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={60}
              accessibilityLabel="Event Title"
            />

            <ThemedText style={styles.label}>Description</ThemedText>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add more details about your event..."
              placeholderTextColor="#8CA0B8"
              multiline
              maxLength={200}
              textAlignVertical="top"
              accessibilityLabel="Description"
            />

            <ThemedText style={styles.label}>Date &amp; Time</ThemedText>
            <View style={styles.dateRow}>
              <Pressable style={[styles.detailInput, styles.dateInput]} onPress={() => setDateModalVisible(true)} accessibilityRole="button" accessibilityLabel="Select date">
                <MaterialIcons name="event" size={20} color="#56708E" />
                <View>
                  <ThemedText style={styles.detailCaption}>Date <ThemedText style={styles.required}>*</ThemedText></ThemedText>
                  <ThemedText style={styles.detailValue}>{formattedDate}</ThemedText>
                </View>
              </Pressable>
              <Pressable style={[styles.detailInput, styles.dateInput]} onPress={() => setDateModalVisible(true)} accessibilityRole="button" accessibilityLabel="Select time">
                <MaterialIcons name="schedule" size={20} color="#56708E" />
                <View>
                  <ThemedText style={styles.detailCaption}>Time <ThemedText style={styles.required}>*</ThemedText></ThemedText>
                  <ThemedText style={styles.detailValue}>{formattedTime}</ThemedText>
                </View>
              </Pressable>
            </View>

            <ThemedText style={styles.label}>Location</ThemedText>
            <Pressable style={styles.locationInput} onPress={() => setLocationModalVisible(true)} accessibilityRole="button" accessibilityLabel="Add a location">
              <MaterialIcons name="place" size={21} color="#56708E" />
              <ThemedText style={[styles.detailValue, !location && styles.placeholder]}>{location || 'Add a location'}</ThemedText>
              <MaterialIcons name="chevron-right" size={22} color="#56708E" />
            </Pressable>

            <ThemedText style={styles.label}>Event Image</ThemedText>
            <View style={styles.imagePlaceholder}>
              <MaterialIcons name="image" size={27} color="#56708E" />
              <ThemedText style={styles.imageTitle}>Add a photo (optional)</ThemedText>
              <ThemedText style={styles.imageHint}>Make your event more fun with a photo!</ThemedText>
            </View>

            <Pressable style={styles.additionalDetails} onPress={() => setSettingsModalVisible(true)} accessibilityRole="button" accessibilityLabel="Additional event details">
              <MaterialIcons name="tune" size={20} color="#56708E" />
              <ThemedText style={styles.additionalText}>Additional details</ThemedText>
              <MaterialIcons name="chevron-right" size={22} color="#56708E" />
            </Pressable>
          </View>

          {error !== null && <ThemedText style={styles.errorMessage}>{error}</ThemedText>}
          <Pressable
            style={[styles.primaryButton, (!canSubmit || loading) && styles.disabledButton]}
            disabled={!canSubmit || loading}
            onPress={handleCreateEvent}
            accessibilityRole="button"
            accessibilityLabel="Create Event"
          >
            <ThemedText style={styles.primaryButtonText}>{loading ? 'Creating...' : 'Create Event'}</ThemedText>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <EventDateModal visible={dateModalVisible} date={dateObj} endDate={endDateObj} onChange={handleDateChange} onClose={() => setDateModalVisible(false)} />
      <EventLocationModal visible={locationModalVisible} location={location} onChange={handleLocationChange} onClose={() => setLocationModalVisible(false)} />
      <EventSettingsModal visible={settingsModalVisible} dressCode={dressCode} notes={notes} onChange={handleSettingsChange} onClose={() => setSettingsModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F8FC' },
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 28 },
  header: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#111A30', fontSize: 16, fontWeight: '700' },
  cancel: { color: '#087AC5', fontSize: 13, fontWeight: '600' },
  headerSpacer: { width: 45 },
  progress: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10, paddingHorizontal: 10 },
  progressItem: { alignItems: 'center', gap: 5 },
  stepCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8EEF6' },
  activeStep: { backgroundColor: '#087AC5' },
  stepText: { color: '#45617F', fontSize: 11, fontWeight: '700' },
  activeStepText: { color: '#FFFFFF' },
  stepLabel: { color: '#45617F', fontSize: 10 },
  pageTitle: { color: '#111A30', fontSize: 20, lineHeight: 25, fontWeight: '700', marginTop: 8 },
  subtitle: { color: '#56708E', fontSize: 13, marginTop: 2, marginBottom: 8 },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 6, paddingHorizontal: 6, shadowColor: '#203B5A', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  label: { color: '#16213A', fontSize: 12, fontWeight: '700', marginHorizontal: 2, marginTop: 10, marginBottom: 5 },
  required: { color: '#087AC5' },
  input: { minHeight: 42, borderWidth: 1, borderColor: '#DCE5EF', borderRadius: 9, paddingHorizontal: 10, color: '#16213A', fontSize: 13 },
  descriptionInput: { minHeight: 53, paddingTop: 10 },
  dateRow: { flexDirection: 'row', gap: 8 },
  detailInput: { minHeight: 54, borderWidth: 1, borderColor: '#DCE5EF', borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 9 },
  dateInput: { flex: 1 },
  detailCaption: { color: '#45617F', fontSize: 10, fontWeight: '600' },
  detailValue: { color: '#56708E', fontSize: 12, marginTop: 3 },
  locationInput: { minHeight: 44, borderWidth: 1, borderColor: '#DCE5EF', borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10 },
  placeholder: { flex: 1, color: '#8CA0B8' },
  imagePlaceholder: { minHeight: 77, borderWidth: 1, borderStyle: 'dashed', borderColor: '#B7C9DC', borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  imageTitle: { color: '#45617F', fontSize: 12, fontWeight: '600', marginTop: 3 },
  imageHint: { color: '#8CA0B8', fontSize: 10, marginTop: 2 },
  additionalDetails: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42, paddingHorizontal: 4 },
  additionalText: { flex: 1, color: '#45617F', fontSize: 12, fontWeight: '600' },
  primaryButton: { minHeight: 46, borderRadius: 11, backgroundColor: '#087AC5', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  disabledButton: { opacity: 0.5 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  errorMessage: { color: '#C0392B', textAlign: 'center', fontSize: 12, marginTop: 10 },
});