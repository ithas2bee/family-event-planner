import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createAnnouncement } from '@/services/announcementService';

export default function CreateAnnouncementScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const groupIdValue = String(groupId ?? '');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        expiresAt: expiresAt.trim() || undefined,
      });

      router.replace({
        pathname: '/announcements',
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
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Create Announcement
      </ThemedText>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Title
        </ThemedText>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter announcement title"
          autoCapitalize="words"
          autoCorrect={false}
        />
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Body
        </ThemedText>
        <TextInput
          style={styles.input}
          value={body}
          onChangeText={setBody}
          placeholder="Enter announcement body"
          multiline
        />
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Expires At
        </ThemedText>
        <TextInput
          style={styles.input}
          value={expiresAt}
          onChangeText={setExpiresAt}
          placeholder="Optional expiration date"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </ThemedView>

      <Pressable
        style={[styles.primaryButton, (!canSubmit || loading) && styles.buttonDisabled]}
        onPress={handleCreateAnnouncement}
        disabled={!canSubmit || loading}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
            Create Announcement
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