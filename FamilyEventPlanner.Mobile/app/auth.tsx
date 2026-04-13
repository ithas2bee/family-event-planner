import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function AuthScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Family Event Planner
      </ThemedText>

      <ThemedText style={styles.subtitle}>
        Sign in or create an account to continue.
      </ThemedText>

      <Pressable style={styles.primaryButton} onPress={() => router.push('/login')}>
        <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
          Login
        </ThemedText>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => router.push('/create-account')}>
        <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
          Create Account
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  title: {
    textAlign: 'center',
    fontSize: 32,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 10,
  },
  primaryButton: {
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
});
