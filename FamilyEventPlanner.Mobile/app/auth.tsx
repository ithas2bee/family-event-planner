import { router } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PRIVACY_POLICY_URL } from '@/constants/privacyPolicy';

export default function AuthScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Huddle Up
      </ThemedText>

      <ThemedText style={styles.subtitle}>
        Plan together. Make more memories.
      </ThemedText>

      <Pressable style={styles.primaryButton} onPress={() => router.push('/login')}>
        <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
          Sign In
        </ThemedText>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => router.push('/create-account')}>
        <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
          Create Account
        </ThemedText>
      </Pressable>
      <ExternalLink href={PRIVACY_POLICY_URL} accessibilityRole="link" style={styles.privacyPolicyLink}>
        <ThemedText style={styles.privacyPolicyText}>Privacy Policy</ThemedText>
      </ExternalLink>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFF',
  },
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
    backgroundColor: '#1677E8',
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
    borderColor: '#1677E8',
  },
  secondaryButtonText: {
    color: '#1677E8',
    fontSize: 16,
  },
  privacyPolicyLink: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  privacyPolicyText: {
    color: '#1677E8',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
