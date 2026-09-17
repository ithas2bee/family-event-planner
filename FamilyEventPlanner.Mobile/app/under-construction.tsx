import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function UnderConstructionScreen() {
  const insets = useSafeAreaInsets();
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const featureName = typeof feature === 'string' && feature.trim() ? feature : 'This feature';

  return (
    <ThemedView style={[styles.container, { paddingTop: Math.max(insets.top, 24) }]}>
      <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={24} color="#17345D" />
      </Pressable>
      <View style={styles.content}>
        <View style={styles.illustration}>
          <MaterialIcons name="construction" size={54} color="#0A7EA4" />
        </View>
        <ThemedText style={styles.eyebrow}>COMING SOON</ThemedText>
        <ThemedText type="title" style={styles.title}>{featureName}</ThemedText>
        <ThemedText style={styles.message}>We&apos;re still working on this feature. Check back in a future update.</ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel="Return to previous screen" onPress={() => router.back()} style={styles.returnButton}>
          <ThemedText style={styles.returnButtonText}>Return to previous screen</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBFD', paddingHorizontal: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EAF2F6', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  illustration: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF5F8', marginBottom: 24 },
  eyebrow: { color: '#0A7EA4', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#10264C', fontSize: 30, textAlign: 'center', marginTop: 8 },
  message: { maxWidth: 320, color: '#71819A', fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 12 },
  returnButton: { marginTop: 28, borderRadius: 24, backgroundColor: '#0A7EA4', paddingHorizontal: 22, paddingVertical: 14 },
  returnButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
