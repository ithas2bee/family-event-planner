import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { saveSession } from '@/services/sessionService';
import { registerUser } from '@/services/userService';

export default function CreateAccountScreen() {
  const { refreshMembership } = useActiveGroupContext();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = username.trim().length >= 2 && email.trim().length > 0 && password.length >= 8;

  async function handleCreateAccount() {
    setError(null);
    setLoading(true);
    try {
      const user = await registerUser({ displayName: username.trim(), email: email.trim(), password });
      await saveSession({ userId: user.userId, displayName: user.displayName, email: user.email, authToken: user.authToken ?? null });
      await refreshMembership();
      router.replace('/(tabs)/(main)/my-groups');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  }

  function providerUnavailable(provider: string) {
    setError(`${provider} sign-in is not configured yet.`);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.container}>
          <ThemedText style={styles.brand}>Huddle Up</ThemedText>
          <ThemedText style={styles.tagline}>Plan together. Make more memories.</ThemedText>
          <ThemedText type="title" style={styles.title}>Create Account</ThemedText>
          <ThemedText style={styles.subtitle}>Join Huddle Up and start planning with your family.</ThemedText>

          <View style={styles.fieldGroup}><ThemedText style={styles.label}>Email</ThemedText><View style={styles.inputWrap}><Ionicons name="mail-outline" size={21} color="#5C6F8D" /><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@example.com" placeholderTextColor="#7183A0" autoCapitalize="none" keyboardType="email-address" autoCorrect={false} /></View></View>
          <View style={styles.fieldGroup}><ThemedText style={styles.label}>Username</ThemedText><View style={styles.inputWrap}><Ionicons name="person-outline" size={21} color="#5C6F8D" /><TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Choose a username" placeholderTextColor="#7183A0" autoCapitalize="none" autoCorrect={false} /></View><ThemedText style={styles.help}>This will be your public name in the app.</ThemedText></View>
          <View style={styles.fieldGroup}><ThemedText style={styles.label}>Password</ThemedText><View style={styles.inputWrap}><Ionicons name="lock-closed-outline" size={21} color="#5C6F8D" /><TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Create a password" placeholderTextColor="#7183A0" secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} /><Pressable accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword((visible) => !visible)}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={23} color="#5C6F8D" /></Pressable></View><ThemedText style={styles.help}>Use at least 8 characters with a mix of letters, numbers, and symbols.</ThemedText></View>

          <Pressable style={[styles.primaryButton, (!canSubmit || loading) && styles.disabled]} onPress={handleCreateAccount} disabled={!canSubmit || loading}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText style={styles.primaryButtonText}>Create Account</ThemedText>}</Pressable>
          <View style={styles.orRow}><View style={styles.rule} /><ThemedText style={styles.or}>OR</ThemedText><View style={styles.rule} /></View>
          <Pressable style={styles.providerButton} onPress={() => providerUnavailable('Google')}><ThemedText style={styles.providerIcon}>G</ThemedText><ThemedText style={styles.providerText}>Continue with Google</ThemedText></Pressable>
          <Pressable style={styles.providerButton} onPress={() => providerUnavailable('Facebook')}><ThemedText style={styles.facebookIcon}>f</ThemedText><ThemedText style={styles.providerText}>Continue with Facebook</ThemedText></Pressable>
          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
          <View style={styles.footer}><ThemedText style={styles.footerText}>Already have an account? </ThemedText><Pressable onPress={() => router.replace('/login')}><ThemedText style={styles.link}>Sign In</ThemedText></Pressable></View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7FAFF' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  container: { gap: 12 },
  brand: { color: '#101B5A', fontSize: 38, fontWeight: '800', textAlign: 'center' },
  tagline: { color: '#536987', fontSize: 16, textAlign: 'center', marginBottom: 22 },
  title: { color: '#101B5A', textAlign: 'center', fontSize: 32 },
  subtitle: { color: '#536987', textAlign: 'center', fontSize: 18, lineHeight: 27, marginBottom: 14 },
  fieldGroup: { gap: 7 },
  label: { color: '#536987', fontSize: 16, fontWeight: '600' },
  inputWrap: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#D0DCEB', borderRadius: 16, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  input: { flex: 1, color: '#101B5A', fontSize: 16, paddingVertical: 14 },
  help: { color: '#536987', fontSize: 14, lineHeight: 20 },
  primaryButton: { minHeight: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#1677E8', marginTop: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 8 },
  rule: { flex: 1, height: 1, backgroundColor: '#D0DCEB' },
  or: { color: '#536987', fontWeight: '700' },
  providerButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, borderWidth: 1.5, borderColor: '#D0DCEB', borderRadius: 16, backgroundColor: '#FFFFFF' },
  providerIcon: { color: '#4285F4', fontSize: 25, fontWeight: '800' },
  facebookIcon: { color: '#1877F2', fontSize: 29, fontWeight: '800' },
  providerText: { color: '#101B5A', fontSize: 16, fontWeight: '700' },
  error: { color: '#C0392B', textAlign: 'center', fontSize: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  footerText: { color: '#536987', fontSize: 16 },
  link: { color: '#0879F9', fontSize: 16, fontWeight: '600', textDecorationLine: 'underline' },
});
