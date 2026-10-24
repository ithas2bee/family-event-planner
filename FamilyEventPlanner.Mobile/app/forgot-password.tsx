import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { ThemedText } from '@/components/themed-text';
import { requestPasswordReset } from '@/services/userService';

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to request a reset link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenLayout>
      <ThemedText style={styles.brand}>Huddle Up</ThemedText>
      <ThemedText type="title" style={styles.title}>Forgot Password?</ThemedText>
      <ThemedText style={styles.subtitle}>
        Enter the email address you use to sign in. If an account exists, we&apos;ll send a password reset link.
      </ThemedText>

      {submitted ? (
        <ThemedText accessibilityRole="text" style={styles.success}>
          If an account exists for {email.trim()}, a reset link will be sent. Check your inbox and spam folder.
        </ThemedText>
      ) : (
        <>
          <View style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={21} color="#5C6F8D" />
              <TextInput
                accessibilityLabel="Email"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor="#7183A0"
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>
          </View>

          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
          <Pressable
            accessibilityRole="button"
            style={[styles.primaryButton, (!email.trim() || loading) && styles.disabled]}
            onPress={handleSubmit}
            disabled={!email.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <ThemedText style={styles.primaryButtonText}>Send Reset Link</ThemedText>}
          </Pressable>
        </>
      )}

      <View style={styles.footer}>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/login')}>
          <ThemedText style={styles.link}>Back to Sign In</ThemedText>
        </Pressable>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  brand: { color: '#101B5A', fontSize: 38, lineHeight: 56, fontWeight: '800', textAlign: 'center' },
  title: { color: '#101B5A', textAlign: 'center', fontSize: 30, lineHeight: 36 },
  subtitle: { color: '#536987', textAlign: 'center', fontSize: 16, lineHeight: 24, marginBottom: 14 },
  fieldGroup: { gap: 7 },
  label: { color: '#536987', fontSize: 16, fontWeight: '600' },
  inputWrap: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#D0DCEB', borderRadius: 16, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  input: { flex: 1, color: '#101B5A', fontSize: 16, paddingVertical: 14 },
  primaryButton: { minHeight: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#1677E8', marginTop: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  error: { color: '#C0392B', textAlign: 'center', fontSize: 14 },
  success: { color: '#247A45', textAlign: 'center', fontSize: 16, lineHeight: 24 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  link: { color: '#0879F9', fontSize: 16, fontWeight: '600', textDecorationLine: 'underline' },
});
