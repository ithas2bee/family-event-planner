import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { joinFamilyGroup } from '@/services/groupMemberService';
import { loadSession, saveSession, type AppSession } from '@/services/sessionService';

export default function JoinGroupScreen() {
  const [session, setSession] = useState<AppSession | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function restoreSession() {
      const existing = await loadSession();
      if (!existing) {
        router.replace('/auth');
        return;
      }
      setSession(existing);
    }

    restoreSession();
  }, []);

  const canJoin = inviteCode.trim().length > 0 && session !== null;

  async function handleJoin() {
    if (!session) {
      setError('Please log in before joining a group.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const result = await joinFamilyGroup({
        inviteCode: inviteCode.trim(),
        userId: session.userId,
      });

      const groupId = String(result.groupId ?? '');
      const memberId = String(result.memberId ?? '');
      const groupName = String(result.groupName ?? '');
      const memberName = String(result.memberName ?? session.displayName);

      await saveSession({
        ...session,
        memberId,
        groupId,
        memberName,
        groupName,
        isAdmin: false,
        authToken: null,
      });

      router.replace({
        pathname: '/family-home',
        params: { groupId, memberId, groupName, memberName },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Join a Family Group
      </ThemedText>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Invite Code
        </ThemedText>
        <TextInput
          style={styles.input}
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="Enter invite code"
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </ThemedView>

      <Pressable
        style={[
          styles.joinButton,
          (!canJoin || loading) && styles.joinButtonDisabled,
        ]}
        onPress={handleJoin}
        disabled={!canJoin || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText type="defaultSemiBold" style={styles.joinButtonText}>
            Join Group
          </ThemedText>
        )}
      </Pressable>

      {error !== null && (
        <ThemedText style={styles.feedbackError}>{error}</ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
    marginBottom: 8,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#BCC3CC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  joinButton: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#0A7EA4',
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  feedbackError: {
    color: '#C0392B',
    textAlign: 'center',
    fontSize: 14,
  },
});
