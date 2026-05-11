import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { loadSession, saveSession } from '@/services/sessionService';

const API_BASE_URL = 'http://10.0.0.115:5249';

export default function CreateGroupScreen() {
  const { setActiveGroup } = useActiveGroupContext();
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = groupName.trim().length > 0;

  async function handleCreateGroup() {
    setError(null);
    setLoading(true);

    try {
      const session = await loadSession();
      if (!session) {
        router.replace('/auth');
        return;
      }

      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}/api/familygroups`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ name: groupName.trim(), userId: session.userId }),
        });
      } catch {
        throw new Error('Could not reach the server. Check your network connection.');
      }

      const rawBody = await response.text();

      let parsed: {
        groupId?: string;
        groupName?: string;
        inviteCode?: string;
        memberId?: string;
        isAdmin?: boolean;
      } = {};

      try {
        parsed = JSON.parse(rawBody);
      } catch {
        throw new Error('The server returned an unexpected response.');
      }

      if (!response.ok) {
        const msg =
          (parsed as { message?: string }).message ??
          (parsed as { title?: string }).title ??
          `Failed to create group (error ${response.status}).`;
        throw new Error(msg);
      }

      const groupId = String(parsed.groupId ?? '');
      const resolvedGroupName = String(parsed.groupName ?? groupName.trim());
      const memberId = String(parsed.memberId ?? '');

      await saveSession({
        ...session,
        groupId,
        groupName: resolvedGroupName,
        memberId,
        isAdmin: parsed.isAdmin ?? true,
      });

      await setActiveGroup({
        groupId,
        groupName: resolvedGroupName,
        memberId,
        memberName: session.displayName,
      });

      router.replace({
        pathname: '/(tabs)/family-home',
        params: { groupId, groupName: resolvedGroupName, memberId, memberName: session.displayName },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Create a Group
      </ThemedText>

      <ThemedView style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Group Name
        </ThemedText>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Enter group name"
          autoCapitalize="words"
          autoCorrect={false}
        />
      </ThemedView>

      <Pressable
        style={[styles.primaryButton, (!canSubmit || loading) && styles.buttonDisabled]}
        onPress={handleCreateGroup}
        disabled={!canSubmit || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
            Create Group
          </ThemedText>
        )}
      </Pressable>

      {error !== null ? <ThemedText style={styles.feedbackError}>{error}</ThemedText> : null}
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
  primaryButton: {
    marginTop: 6,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#0A7EA4',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  feedbackError: {
    color: '#C0392B',
    textAlign: 'center',
    fontSize: 14,
  },
});
