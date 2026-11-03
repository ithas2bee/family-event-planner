import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  createFeedbackEmailUrl,
  FEEDBACK_CATEGORIES,
  FEEDBACK_MAX_LENGTH,
  type FeedbackCategory,
  validateFeedbackMessage,
} from '@/services/supportService';

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<FeedbackCategory>('General feedback');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitFeedback = async () => {
    const validationError = validateFeedbackMessage(message);
    if (validationError) {
      setError(validationError);
      setSubmitted(false);
      return;
    }

    setSubmitting(true);
    setError('');
    setSubmitted(false);
    try {
      await Linking.openURL(await createFeedbackEmailUrl(category, message.trim()));
      setSubmitted(true);
    } catch {
      setError('Unable to open your email app. Please install or configure one and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#17345D" />
          </Pressable>
          <View style={styles.headerCopy}>
            <ThemedText style={styles.eyebrow}>CONTACT SUPPORT</ThemedText>
            <ThemedText type="title" style={styles.title}>Send Feedback</ThemedText>
            <ThemedText style={styles.subtitle}>Tell us what you think about Huddle Up.</ThemedText>
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.label}>Feedback type</ThemedText>
          <View style={styles.categories}>
            {FEEDBACK_CATEGORIES.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: category === item }}
                onPress={() => {
                  setCategory(item);
                  setError('');
                  setSubmitted(false);
                }}
                style={[styles.category, category === item && styles.selectedCategory]}
              >
                <ThemedText style={[styles.categoryText, category === item && styles.selectedCategoryText]}>{item}</ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText style={styles.label}>Your feedback</ThemedText>
          <TextInput
            accessibilityLabel="Your feedback"
            value={message}
            onChangeText={(value) => {
              setMessage(value);
              setError('');
              setSubmitted(false);
            }}
            placeholder="Share your idea or tell us about an issue."
            placeholderTextColor="#8A96AA"
            style={styles.messageInput}
            multiline
            maxLength={FEEDBACK_MAX_LENGTH}
            textAlignVertical="top"
          />
          <ThemedText style={styles.characterCount}>{message.length}/{FEEDBACK_MAX_LENGTH}</ThemedText>
          <ThemedText style={styles.emailHint}>Your email app will open with a draft. Review it and tap Send to submit.</ThemedText>

          {error ? <ThemedText accessibilityRole="alert" style={styles.error}>{error}</ThemedText> : null}
          {submitted ? (
            <ThemedText accessibilityRole="text" style={styles.success}>
              Feedback draft opened. Send it from your email app to complete submission.
            </ThemedText>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit feedback"
            disabled={submitting}
            onPress={submitFeedback}
            style={[styles.submitButton, submitting && styles.disabledButton]}
          >
            {submitting
              ? <ActivityIndicator color="#FFFFFF" />
              : <ThemedText style={styles.submitText}>Submit feedback</ThemedText>}
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBFD' },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 22 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EAF2F6', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 4 },
  eyebrow: { color: '#0A7EA4', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#10264C', fontSize: 30, lineHeight: 36 },
  subtitle: { color: '#71819A', fontSize: 15 },
  card: { padding: 18, borderRadius: 18, backgroundColor: '#FFFFFF', shadowColor: '#17345D', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  label: { color: '#17345D', fontSize: 15, fontWeight: '700', marginBottom: 9 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { borderWidth: 1, borderColor: '#CDD5E3', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  selectedCategory: { borderColor: '#0A7EA4', backgroundColor: '#EAF5F8' },
  categoryText: { color: '#53627F', fontSize: 14 },
  selectedCategoryText: { color: '#0A7EA4', fontWeight: '700' },
  messageInput: { minHeight: 150, borderWidth: 1, borderColor: '#CDD5E3', borderRadius: 11, backgroundColor: '#FFFFFF', padding: 12, color: '#17345D', fontSize: 16 },
  characterCount: { color: '#71819A', fontSize: 12, textAlign: 'right', marginTop: 6 },
  emailHint: { color: '#71819A', fontSize: 13, lineHeight: 19, marginTop: 12 },
  error: { color: '#B42318', fontSize: 14, marginTop: 12 },
  success: { color: '#167447', fontSize: 14, lineHeight: 20, marginTop: 12 },
  submitButton: { minHeight: 50, borderRadius: 12, backgroundColor: '#0A7EA4', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  disabledButton: { opacity: 0.65 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
