import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { ThemedText } from '@/components/themed-text';

export default function ForgotUsernameScreen() {
  return (
    <AuthScreenLayout>
      <ThemedText style={styles.brand}>Huddle Up</ThemedText>
      <ThemedText type="title" style={styles.title}>Forgot Username?</ThemedText>
      <ThemedText style={styles.copy}>
        Your username is your public name in Huddle Up. Sign in with the email address you registered with.
      </ThemedText>
      <ThemedText style={styles.copy}>
        If you no longer have access to that email address, contact support for help with your account.
      </ThemedText>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => router.replace('/login')}>
          <ThemedText style={styles.primaryButtonText}>Back to Sign In</ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/help-support')}>
          <ThemedText style={styles.link}>Contact Support</ThemedText>
        </Pressable>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  brand: { color: '#101B5A', fontSize: 38, lineHeight: 56, fontWeight: '800', textAlign: 'center' },
  title: { color: '#101B5A', textAlign: 'center', fontSize: 30, lineHeight: 36 },
  copy: { color: '#536987', textAlign: 'center', fontSize: 16, lineHeight: 24 },
  actions: { alignItems: 'center', gap: 14, marginTop: 8 },
  primaryButton: { minHeight: 58, width: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#1677E8' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  link: { color: '#0879F9', fontSize: 16, fontWeight: '600', textDecorationLine: 'underline' },
});
