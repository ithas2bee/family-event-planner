import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { ThemedText } from '@/components/themed-text';
import { resetPassword } from '@/services/userService';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const token = typeof params.token === 'string' ? params.token : '';
  const validPassword = password.length >= 8 &&
    password.length <= 128 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z\d]/.test(password);

  async function handleSubmit() {
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await resetPassword({ token, password, confirmPassword });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'This reset link is invalid or expired. Request a new link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenLayout>
      <ThemedText style={styles.brand}>Huddle Up</ThemedText>
      <ThemedText type="title" style={styles.title}>Reset Password</ThemedText>

      {submitted ? (
        <>
          <ThemedText accessibilityRole="text" style={styles.success}>
            Your password has been reset. You can now sign in with your new password.
          </ThemedText>
          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => router.replace('/login')}>
            <ThemedText style={styles.primaryButtonText}>Back to Sign In</ThemedText>
          </Pressable>
        </>
      ) : (
        <>
          {!token ? <ThemedText style={styles.error}>This reset link is invalid or expired. Request a new link.</ThemedText> : null}
          <View style={styles.fieldGroup}>
            <ThemedText style={styles.label}>New Password</ThemedText>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={21} color="#5C6F8D" />
              <TextInput
                accessibilityLabel="New Password"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Create a new password"
                placeholderTextColor="#7183A0"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                onPress={() => setShowPassword((visible) => !visible)}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={23} color="#5C6F8D" />
              </Pressable>
            </View>
            <ThemedText style={styles.help}>Use at least 8 characters with a letter, number, and symbol.</ThemedText>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Confirm Password</ThemedText>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={21} color="#5C6F8D" />
              <TextInput
                accessibilityLabel="Confirm Password"
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your new password"
                placeholderTextColor="#7183A0"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
          <Pressable
            accessibilityRole="button"
            style={[styles.primaryButton, (!token || !validPassword || !confirmPassword || loading) && styles.disabled]}
            onPress={handleSubmit}
            disabled={!token || !validPassword || !confirmPassword || loading}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <ThemedText style={styles.primaryButtonText}>Save New Password</ThemedText>}
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.footer} onPress={() => router.replace('/login')}>
            <ThemedText style={styles.link}>Back to Sign In</ThemedText>
          </Pressable>
        </>
      )}
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  brand: { color: '#101B5A', fontSize: 38, lineHeight: 56, fontWeight: '800', textAlign: 'center' },
  title: { color: '#101B5A', textAlign: 'center', fontSize: 30, lineHeight: 36 },
  fieldGroup: { gap: 7 },
  label: { color: '#536987', fontSize: 16, fontWeight: '600' },
  inputWrap: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#D0DCEB', borderRadius: 16, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  input: { flex: 1, color: '#101B5A', fontSize: 16, paddingVertical: 14 },
  help: { color: '#536987', fontSize: 14, lineHeight: 20 },
  primaryButton: { minHeight: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#1677E8', marginTop: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  error: { color: '#C0392B', textAlign: 'center', fontSize: 14, lineHeight: 20 },
  success: { color: '#247A45', textAlign: 'center', fontSize: 16, lineHeight: 24 },
  footer: { alignSelf: 'center', marginTop: 12 },
  link: { color: '#0879F9', fontSize: 16, fontWeight: '600', textDecorationLine: 'underline' },
});
