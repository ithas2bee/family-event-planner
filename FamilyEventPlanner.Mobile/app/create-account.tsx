import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { ThemedText } from '@/components/themed-text';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { saveSession } from '@/services/sessionService';
import { getDateOfBirthError } from '@/services/registrationAge';
import { getRegistrationPolicy, registerUser, type RegistrationPolicy } from '@/services/userService';

export default function CreateAccountScreen() {
  const { refreshMembership } = useActiveGroupContext();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [registrationPolicy, setRegistrationPolicy] = useState<RegistrationPolicy | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [policyRequestKey, setPolicyRequestKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getRegistrationPolicy()
      .then((policy) => {
        if (active) {
          setRegistrationPolicy(policy);
          setError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load registration requirements.');
        }
      })
      .finally(() => {
        if (active) {
          setPolicyLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [policyRequestKey]);

  const dateOfBirthError = dateOfBirth.trim() && registrationPolicy
    ? getDateOfBirthError(dateOfBirth, registrationPolicy.minimumAge, registrationPolicy.maximumAge)
    : null;
  const canSubmit =
    username.trim().length >= 2 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    dateOfBirth.trim().length > 0 &&
    registrationPolicy !== null &&
    dateOfBirthError === null;

  async function handleCreateAccount() {
    setError(null);
    if (!registrationPolicy) {
      setError('Unable to load registration requirements. Please try again later.');
      return;
    }

    const ageError = getDateOfBirthError(
      dateOfBirth,
      registrationPolicy.minimumAge,
      registrationPolicy.maximumAge,
    );
    if (ageError) {
      setError(ageError);
      return;
    }

    setLoading(true);
    try {
      const user = await registerUser({
        displayName: username.trim(),
        email: email.trim(),
        password,
        dateOfBirth: dateOfBirth.trim(),
      });
      await saveSession({ userId: user.userId, displayName: user.displayName, email: user.email, authToken: user.authToken ?? null });
      await refreshMembership();
      router.replace('/(tabs)/(main)/my-groups');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenLayout>
          <ThemedText style={styles.brand}>Huddle Up</ThemedText>
          <ThemedText style={styles.tagline}>Plan together. Make more memories.</ThemedText>
          <ThemedText type="title" style={styles.title}>Create Account</ThemedText>
          <ThemedText style={styles.subtitle}>Join Huddle Up and start planning with your community.</ThemedText>

          <View style={styles.fieldGroup}><ThemedText style={styles.label}>Email</ThemedText><View style={styles.inputWrap}><Ionicons name="mail-outline" size={21} color="#5C6F8D" /><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@example.com" placeholderTextColor="#7183A0" autoCapitalize="none" keyboardType="email-address" autoCorrect={false} /></View></View>
          <View style={styles.fieldGroup}><ThemedText style={styles.label}>Username</ThemedText><View style={styles.inputWrap}><Ionicons name="person-outline" size={21} color="#5C6F8D" /><TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Choose a username" placeholderTextColor="#7183A0" autoCapitalize="none" autoCorrect={false} /></View><ThemedText style={styles.help}>This will be your public name in the app.</ThemedText></View>
          <View style={styles.fieldGroup}><ThemedText style={styles.label}>Date of birth</ThemedText><View style={styles.inputWrap}><Ionicons name="calendar-outline" size={21} color="#5C6F8D" /><TextInput style={styles.input} value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" placeholderTextColor="#7183A0" keyboardType="numbers-and-punctuation" maxLength={10} autoCapitalize="none" autoCorrect={false} accessibilityLabel="Date of birth in year-month-day format" /></View><ThemedText style={styles.help}>{registrationPolicy ? `Huddle Up is for people ${registrationPolicy.minimumAge} or older.` : 'Huddle Up requires users to meet the minimum age requirement.'} Your date is used only to check eligibility and is not saved.</ThemedText>{dateOfBirthError ? <ThemedText style={styles.error}>{dateOfBirthError}</ThemedText> : null}</View>
          <View style={styles.fieldGroup}><ThemedText style={styles.label}>Password</ThemedText><View style={styles.inputWrap}><Ionicons name="lock-closed-outline" size={21} color="#5C6F8D" /><TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Create a password" placeholderTextColor="#7183A0" secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} /><Pressable accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword((visible) => !visible)}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={23} color="#5C6F8D" /></Pressable></View><ThemedText style={styles.help}>Use at least 8 characters with a mix of letters, numbers, and symbols.</ThemedText></View>

          <Pressable style={[styles.primaryButton, (!canSubmit || loading || policyLoading) && styles.disabled]} onPress={handleCreateAccount} disabled={!canSubmit || loading || policyLoading}>{loading || policyLoading ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText style={styles.primaryButtonText}>Create Account</ThemedText>}</Pressable>
          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
          {!policyLoading && !registrationPolicy ? <Pressable onPress={() => { setError(null); setPolicyLoading(true); setPolicyRequestKey((key) => key + 1); }}><ThemedText style={styles.link}>Retry loading requirements</ThemedText></Pressable> : null}
          <View style={styles.footer}><ThemedText style={styles.footerText}>Already have an account? </ThemedText><Pressable onPress={() => router.replace('/login')}><ThemedText style={styles.link}>Sign In</ThemedText></Pressable></View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  brand: { color: '#101B5A', fontSize: 38, lineHeight: 56, fontWeight: '800', textAlign: 'center' },
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
  error: { color: '#C0392B', textAlign: 'center', fontSize: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  footerText: { color: '#536987', fontSize: 16 },
  link: { color: '#0879F9', fontSize: 16, fontWeight: '600', textDecorationLine: 'underline' },
});
