import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { getGroupMembers, type GroupMember } from '@/services/groupMemberService';

export default function MembersScreen() {
  const { groupId, memberId } = useLocalSearchParams<{ groupId: string; memberId: string }>();
  const {
    groupId: contextGroupId,
    memberId: contextMemberId,
    setActiveGroup,
    isReady,
    isResolvingMember,
  } = useActiveGroupContext();
  const groupIdValue = String(groupId ?? contextGroupId ?? '');
  const memberIdValue = String(memberId ?? contextMemberId ?? '');

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const update: { groupId?: string; memberId?: string } = {};
    if (groupId) {
      update.groupId = String(groupId);
    }
    if (memberId) {
      update.memberId = String(memberId);
    }

    if (Object.keys(update).length === 0) {
      return;
    }

    void setActiveGroup(update);
  }, [groupId, memberId, setActiveGroup]);

  useEffect(() => {
    async function loadMembers() {
      setLoading(true);
      setError(null);

      if (groupIdValue.length === 0 || memberIdValue.length === 0) {
        if (!isReady || isResolvingMember) {
          return;
        }

        setError('Group not found.');
        setLoading(false);
        return;
      }

      try {
        const data = await getGroupMembers(groupIdValue, memberIdValue);
        console.log('[MembersScreen] received members', data);
        setMembers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }

    void loadMembers();
  }, [groupIdValue, memberIdValue, isReady, isResolvingMember]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Members
      </ThemedText>

      {loading && <ThemedText style={styles.feedback}>Loading members...</ThemedText>}

      {!loading && error !== null && (
        <ThemedText style={styles.feedbackError}>{error}</ThemedText>
      )}

      {!loading && error === null && (
        <FlatList
          data={members}
          keyExtractor={(item, index) => String(item.memberId ?? index)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <ThemedText type="defaultSemiBold">
                {item.displayName ?? 'Unknown'}
                {item.isAdmin ? ' (Admin)' : ''}
              </ThemedText>
            </View>
          )}
          ListEmptyComponent={
            <ThemedText style={styles.feedback}>No members found.</ThemedText>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  title: {
    textAlign: 'center',
    fontSize: 30,
    lineHeight: 34,
  },
  memberRow: {
    paddingVertical: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#D5D8DC',
  },
  feedback: {
    textAlign: 'center',
    opacity: 0.7,
  },
  feedbackError: {
    color: '#C0392B',
    textAlign: 'center',
    fontSize: 14,
  },
});
