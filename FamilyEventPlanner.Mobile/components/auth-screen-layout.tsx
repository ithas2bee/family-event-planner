import type { ReactNode } from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';

type AuthScreenLayoutProps = {
  children: ReactNode;
};

export function AuthScreenLayout({ children }: AuthScreenLayoutProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.container}>{children}</ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7FAFF' },
  content: { flexGrow: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 },
});
