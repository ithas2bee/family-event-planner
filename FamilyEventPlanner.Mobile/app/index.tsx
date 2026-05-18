import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { loadSession } from '@/services/sessionService';

export default function StartupGate() {
  useEffect(() => {
    async function checkSession() {
      const session = await loadSession();
      if (!session) {
        router.replace('/auth');
        return;
      }

      if (session.groupId) {
        router.replace('/(tabs)/(main)/family-home');
        return;
      }

      router.replace('/(tabs)/(main)/my-groups');
    }

    void checkSession();
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
