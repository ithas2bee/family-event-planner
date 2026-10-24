import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { ThemedText } from '@/components/themed-text';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { loadSession, saveSession } from '@/services/sessionService';
import { loginUser } from '@/services/userService';

export default function LoginScreen() {
  const { refreshMembership } = useActiveGroupContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const existingSession = await loadSession();
      const user = await loginUser({ email: email.trim(), password });
      const canRestoreActiveSelection = existingSession?.userId === user.userId;

      await saveSession({
        userId: user.userId,
        displayName: user.displayName,
        email: user.email,
        groupId: canRestoreActiveSelection ? existingSession?.groupId : undefined,
        groupName: canRestoreActiveSelection ? existingSession?.groupName : undefined,
        memberId: canRestoreActiveSelection ? existingSession?.memberId : undefined,
        memberName: canRestoreActiveSelection ? existingSession?.memberName : undefined,
        authToken: user.authToken ?? null,
      });
      const hasGroups = await refreshMembership();

      router.replace(hasGroups || (canRestoreActiveSelection && existingSession?.groupId)
        ? '/(tabs)/(main)/family-home'
        : '/group-required');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenLayout>
          <ThemedText style={styles.brand}>Huddle Up</ThemedText>
          <ThemedText style={styles.tagline}>Plan together. Make more memories.</ThemedText>
          <ThemedText type="title" style={styles.title}>Sign In</ThemedText>
          <ThemedText style={styles.subtitle}>Welcome back! Sign in to your account to continue.</ThemedText>

          <View style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Email</ThemedText>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={21} color="#5C6F8D" />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor="#7183A0"
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Password</ThemedText>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={21} color="#5C6F8D" />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#7183A0"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword((visible) => !visible)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={23} color="#5C6F8D" />
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.forgot} onPress={() => router.push({ pathname: '/forgot-password', params: { email: email.trim() } })}>
            <ThemedText style={styles.link}>Forgot Password?</ThemedText>
          </Pressable>

          <Pressable style={styles.forgot} onPress={() => router.push('/forgot-username')}>
            <ThemedText style={styles.link}>Forgot Username?</ThemedText>
          </Pressable>

          <Pressable style={[styles.primaryButton, (!canSubmit || loading) && styles.disabled]} onPress={handleLogin} disabled={!canSubmit || loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText style={styles.primaryButtonText}>Sign In</ThemedText>}
          </Pressable>

          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
          <View style={styles.footer}><ThemedText style={styles.footerText}>Don&apos;t have an account? </ThemedText><Pressable onPress={() => router.replace('/create-account')}><ThemedText style={styles.link}>Create Account</ThemedText></Pressable></View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  brand: { color: '#101B5A', fontSize: 38, lineHeight: 56, fontWeight: '800', textAlign: 'center' },
  tagline: { color: '#536987', fontSize: 16, textAlign: 'center', marginBottom: 28 },
  title: { color: '#101B5A', textAlign: 'center', fontSize: 32 },
  subtitle: { color: '#536987', textAlign: 'center', fontSize: 18, lineHeight: 27, marginBottom: 22 },
  fieldGroup: { gap: 7 },
  label: { color: '#536987', fontSize: 16, fontWeight: '600' },
  inputWrap: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#D0DCEB', borderRadius: 16, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  input: { flex: 1, color: '#101B5A', fontSize: 16, paddingVertical: 14 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 2 },
  link: { color: '#0879F9', fontSize: 16, fontWeight: '600', textDecorationLine: 'underline' },
  primaryButton: { minHeight: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#1677E8', marginTop: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  error: { color: '#C0392B', textAlign: 'center', fontSize: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#536987', fontSize: 16 },
});
