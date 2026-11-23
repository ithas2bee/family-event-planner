import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PRIVACY_POLICY_URL } from '@/constants/privacyPolicy';

type AuthScreenLayoutProps = {
  children: ReactNode;
};

export function AuthScreenLayout({ children }: AuthScreenLayoutProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedView style={styles.container}>
            {children}
            <ExternalLink href={PRIVACY_POLICY_URL} accessibilityRole="link" style={styles.privacyPolicyLink}>
              <ThemedText style={styles.privacyPolicyText}>Privacy Policy</ThemedText>
            </ExternalLink>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7FAFF' },
  keyboardAvoidingView: { flex: 1 },
  content: { flexGrow: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 },
  privacyPolicyLink: { alignSelf: 'center', paddingVertical: 8 },
  privacyPolicyText: { color: '#0879F9', fontSize: 14, textDecorationLine: 'underline' },
});
