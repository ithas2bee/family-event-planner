import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { loadSession, saveSession } from '@/services/sessionService';
import { loginUser } from '@/services/userService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.trim().length > 0;

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const existingSession = await loadSession();

      const user = await loginUser({
        email: email.trim(),
        password,
      });

      const canRestoreActiveSelection = existingSession?.userId === user.userId;

      await saveSession({
        userId: user.userId,
        displayName: user.displayName,
        email: user.email,
        groupId: canRestoreActiveSelection ? existingSession?.groupId : undefined,
        groupName: canRestoreActiveSelection ? existingSession?.groupName : undefined,
        memberId: canRestoreActiveSelection ? existingSession?.memberId : undefined,
        memberName: canRestoreActiveSelection ? existingSession?.memberName : undefined,
        authToken: user.authToken ?? null,
      });

      if (canRestoreActiveSelection && existingSession?.groupId) {
        router.replace('/(tabs)/(main)/family-home');
        return;
      }

      router.replace('/(tabs)/(main)/my-groups');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Login
      </ThemedText>

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
          placeholder="Enter your password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </ThemedView>

      <Pressable
        style={[styles.primaryButton, (!canSubmit || loading) && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={!canSubmit || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
            Login
          </ThemedText>
        )}
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => router.replace('/create-account')}>
        <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
          Create Account
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
