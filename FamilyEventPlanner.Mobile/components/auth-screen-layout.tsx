import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';

type AuthScreenLayoutProps = {
  children: ReactNode;
};

export function AuthScreenLayout({ children }: AuthScreenLayoutProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedView style={styles.container}>{children}</ThemedView>
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
});
