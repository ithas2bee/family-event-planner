import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { clearNotificationPreferences } from '@/services/notificationPreferencesService';
import { submitAccountDeletion } from '@/services/account-deletion.js';
import { deleteCurrentAccount } from '@/services/accountDeletionService';
import { clearSession } from '@/services/sessionService';

export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const { clearActiveGroup } = useActiveGroupContext();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const submissionLock = useRef(false);

  const handleDelete = async () => {
    setError('');
    try {
      await submitAccountDeletion({
        lock: submissionLock,
        password,
        confirmation,
        requestDeletion: deleteCurrentAccount,
        clearActiveGroup,
        clearSession,
        clearPreferences: clearNotificationPreferences,
        setProcessing: setIsProcessing,
        onSuccess: ({ cleanupSucceeded }) => {
          router.dismissAll();
          router.replace({
            pathname: '/account-deleted',
            params: { cleanup: cleanupSucceeded ? 'complete' : 'warning' },
          });
        },
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete your account. Please try again.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Cancel account deletion"
            accessibilityRole="button"
            disabled={isProcessing}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#17345D" />
          </Pressable>
          <View style={styles.headerCopy}>
            <ThemedText style={styles.eyebrow}>ACCOUNT</ThemedText>
            <ThemedText type="title" style={styles.title}>Delete Account</ThemedText>
            <ThemedText style={styles.subtitle}>Review what deletion means before you continue.</ThemedText>
          </View>
        </View>

        <View style={styles.notice}>
          <MaterialIcons name="warning-amber" size={24} color="#A24700" />
          <ThemedText style={styles.noticeText}>
            Account deletion is permanent and cannot be undone. Your account and personal records
            described below will be deleted when you confirm.
          </ThemedText>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>What will be deleted</ThemedText>
          <ThemedText style={styles.body}>
            Your account and profile information, community memberships and role assignments,
            membership requests, event attendance, poll votes, Kickback responses, notifications,
            and password-reset tokens will be removed.
          </ThemedText>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>What remains in your communities</ThemedText>
          <ThemedText style={styles.body}>
            Communities and other members are not deleted. Shared events, polls, announcements,
            Kickbacks, assignments, photos, and their shared files remain available. Your author,
            uploader, or assignee association is removed where supported; assignments are left
            unassigned.
          </ThemedText>
          <ThemedText style={styles.body}>
            Photo files are not deleted. Shared text and photo captions are not scanned or redacted
            and may still contain information about you. Backups and copies outside the API database
            are also outside this deletion process.
          </ThemedText>
        </View>

        <View style={styles.notice}>
          <MaterialIcons name="admin-panel-settings" size={24} color="#A24700" />
          <ThemedText style={styles.noticeText}>
            If you are the last administrator of a community, deletion will be blocked. Assign
            another administrator first; your account and data will remain unchanged if deletion is
            blocked.
          </ThemedText>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Confirm it is you</ThemedText>
          <ThemedText style={styles.body}>
            Enter your current account password and type DELETE exactly. This request is securely
            checked by Huddle Up before any local sign-in data is cleared.
          </ThemedText>
          <ThemedText style={styles.inputLabel}>Current password</ThemedText>
          <TextInput
            accessibilityLabel="Current password"
            autoCapitalize="none"
            autoComplete="current-password"
            editable={!isProcessing}
            onChangeText={setPassword}
            placeholder="Current password"
            secureTextEntry
            style={styles.input}
            textContentType="password"
            value={password}
          />
          <ThemedText style={styles.inputLabel}>Type DELETE to confirm</ThemedText>
          <TextInput
            accessibilityLabel="Type DELETE to confirm"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isProcessing}
            onChangeText={setConfirmation}
            placeholder="DELETE"
            style={styles.input}
            value={confirmation}
          />
        </View>

        {!!error && <ThemedText accessibilityRole="alert" style={styles.error}>{error}</ThemedText>}

        <Pressable
          accessibilityRole="button"
          disabled={isProcessing || !password || confirmation !== 'DELETE'}
          onPress={handleDelete}
          style={[
            styles.deleteButton,
            (isProcessing || !password || confirmation !== 'DELETE') && styles.disabledButton,
          ]}
        >
          {isProcessing ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText style={styles.deleteText}>Permanently Delete Account</ThemedText>}
        </Pressable>
        {isProcessing && <ThemedText accessibilityRole="alert" style={styles.processing}>Deleting your account securely…</ThemedText>}
        <Pressable
          accessibilityRole="button"
          disabled={isProcessing}
          onPress={() => router.back()}
          style={styles.cancelButton}
        >
          <ThemedText style={styles.cancelText}>Cancel</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBFD' },
  content: { paddingHorizontal: 20, paddingBottom: 36, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EAF2F6', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 4 },
  eyebrow: { color: '#0A7EA4', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#10264C', fontSize: 30, lineHeight: 36 },
  subtitle: { color: '#71819A', fontSize: 15, lineHeight: 21 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 16, backgroundColor: '#FFF4E5' },
  noticeText: { flex: 1, color: '#633700', fontSize: 14, lineHeight: 21 },
  card: { gap: 10, padding: 18, borderRadius: 16, backgroundColor: '#FFFFFF', shadowColor: '#17345D', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  sectionTitle: { color: '#17345D', fontSize: 18, fontWeight: '700' },
  body: { color: '#52647A', fontSize: 14, lineHeight: 21 },
  inputLabel: { color: '#17345D', fontSize: 14, fontWeight: '600', marginTop: 4 },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#C8D4E1', borderRadius: 10, backgroundColor: '#FFFFFF', paddingHorizontal: 14, color: '#17345D', fontSize: 16 },
  error: { color: '#B42318', fontSize: 14, lineHeight: 20, paddingHorizontal: 4 },
  deleteButton: { minHeight: 54, borderRadius: 12, backgroundColor: '#B42318', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  disabledButton: { opacity: 0.55 },
  deleteText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  processing: { color: '#52647A', textAlign: 'center', fontSize: 14 },
  cancelButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#17345D', fontSize: 16, fontWeight: '600' },
});
