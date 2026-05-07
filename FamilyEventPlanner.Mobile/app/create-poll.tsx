import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { createPoll } from '@/services/pollService';

export default function CreatePollScreen() {
  const { groupId, memberId } = useLocalSearchParams<{ groupId: string; memberId: string }>();
  const groupIdValue = String(groupId ?? '');
  const memberIdValue = String(memberId ?? '');

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filledOptions = options.filter((o) => o.trim().length > 0);
  const canSubmit =
    question.trim().length > 0 && filledOptions.length >= 2 && groupIdValue.length > 0 && !loading;

  function handleOptionChange(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function handleAddOption() {
    setOptions((prev) => [...prev, '']);
  }

  function handleRemoveOption(index: number) {
    if (options.length <= 2) {
      return;
    }
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreatePoll() {
    setError(null);
    setLoading(true);

    try {
      if (groupIdValue.length === 0) {
        throw new Error('Group not found.');
      }

      const nonEmptyOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);

      if (nonEmptyOptions.length < 2) {
        throw new Error('Please enter at least 2 options.');
      }

      await createPoll({
        familyGroupId: groupIdValue,
        question: question.trim(),
        options: nonEmptyOptions,
      });

      router.replace({
        pathname: '/polls',
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
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Create Poll
      </ThemedText>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Question
        </ThemedText>
        <TextInput
          style={styles.input}
          value={question}
          onChangeText={setQuestion}
          placeholder="Enter your poll question"
          multiline
        />
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Options
        </ThemedText>

        {options.map((option, index) => (
          <ThemedView key={index} style={styles.optionRow}>
            <TextInput
              style={[styles.input, styles.optionInput]}
              value={option}
              onChangeText={(value) => handleOptionChange(index, value)}
              placeholder={`Option ${index + 1}`}
              autoCorrect={false}
            />
            {options.length > 2 && (
              <Pressable style={styles.removeButton} onPress={() => handleRemoveOption(index)}>
                <ThemedText style={styles.removeButtonText}>Remove</ThemedText>
              </Pressable>
            )}
          </ThemedView>
        ))}

        <Pressable style={styles.addButton} onPress={handleAddOption}>
          <ThemedText type="defaultSemiBold" style={styles.addButtonText}>
            + Add Option
          </ThemedText>
        </Pressable>
      </ThemedView>

      {error !== null && <ThemedText style={styles.feedbackError}>{error}</ThemedText>}

      <Pressable
        style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
        onPress={handleCreatePoll}
        disabled={!canSubmit}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
            Create Poll
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
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    flex: 1,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionInput: {
    flex: 1,
  },
  removeButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  removeButtonText: {
    color: '#cc0000',
  },
  addButton: {
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#007AFF',
  },
  feedbackError: {
    color: '#cc0000',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#fff',
  },
});
