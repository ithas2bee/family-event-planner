import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function AccountDeletedScreen() {
  const { cleanup } = useLocalSearchParams<{ cleanup?: string }>();
  const cleanupWarning = cleanup === 'warning';

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="check" size={42} color="#FFFFFF" />
        </View>
        <ThemedText type="title" style={styles.title}>Account deleted</ThemedText>
        <ThemedText style={styles.message}>
          Your account deletion was completed. You have been signed out.
        </ThemedText>
        <ThemedText style={styles.detail}>
          Shared community content and photos may remain for other members as explained in the
          deletion notice.
        </ThemedText>
        {cleanupWarning && (
          <ThemedText accessibilityRole="alert" style={styles.warning}>
            The account was deleted, but some saved data could not be cleared from this device.
            Please clear this app’s local storage before sharing the device.
          </ThemedText>
        )}
        <Pressable accessibilityRole="button" onPress={() => router.replace('/auth')} style={styles.button}>
          <ThemedText style={styles.buttonText}>Continue</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBFD', justifyContent: 'center', padding: 24 },
  content: { alignItems: 'center', gap: 16 },
  iconCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#18794E', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#10264C', fontSize: 30, textAlign: 'center' },
  message: { color: '#17345D', fontSize: 17, lineHeight: 25, textAlign: 'center' },
  detail: { color: '#71819A', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  warning: { color: '#8A4B08', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  button: { minHeight: 52, width: '100%', borderRadius: 12, backgroundColor: '#0A7EA4', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
