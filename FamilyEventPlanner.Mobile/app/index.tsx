import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useActiveGroupContext } from '@/contexts/active-group-context';

export default function StartupGate() {
  const { isReady, isAuthenticated, isResolvingGroups, hasGroups } = useActiveGroupContext();

  useEffect(() => {
    if (!isReady || isResolvingGroups) return;
    router.replace(!isAuthenticated ? '/auth' : hasGroups ? '/(tabs)/(main)/family-home' : '/group-required');
  }, [hasGroups, isAuthenticated, isReady, isResolvingGroups]);

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
