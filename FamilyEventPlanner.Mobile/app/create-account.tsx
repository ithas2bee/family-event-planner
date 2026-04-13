import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { saveSession } from '@/services/sessionService';
import { registerUser } from '@/services/userService';

export default function CreateAccountScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    displayName.trim().length > 0 && email.trim().length > 0 && password.trim().length > 0;

  async function handleCreateAccount() {
    setError(null);
    setLoading(true);
    console.log('[CreateAccount] Submit pressed', {
      email: email.trim(),
      displayName: displayName.trim(),
    });

    try {
      const user = await registerUser({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      });

      console.log('[CreateAccount] Register success', user);

      await saveSession({
        userId: user.userId,
        displayName: user.displayName,
        email: user.email,
        authToken: null,
      });

      router.replace('/my-groups');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to create account.';
      console.log('[CreateAccount] Register failed', { errorMessage });
      setError(errorMessage);
    } finally {
      console.log('[CreateAccount] Finished request, clearing loading state');
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Create Account
      </ThemedText>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Display Name
        </ThemedText>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Enter your name"
          autoCapitalize="words"
          autoCorrect={false}
        />
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Email
        </ThemedText>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />
      </ThemedView>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Password
        </ThemedText>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Create a password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </ThemedView>

      <Pressable
        style={[styles.primaryButton, (!canSubmit || loading) && styles.buttonDisabled]}
        onPress={handleCreateAccount}
        disabled={!canSubmit || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
            Create Account
          </ThemedText>
        )}
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => router.replace('/login')}>
        <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
          Back to Login
        </ThemedText>
      </Pressable>

      {error !== null ? <ThemedText style={styles.feedbackError}>{error}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 14,
  },
  title: {
    textAlign: 'center',
    fontSize: 30,
    marginBottom: 4,
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
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0A7EA4',
  },
  secondaryButtonText: {
    color: '#0A7EA4',
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
