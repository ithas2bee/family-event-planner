import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { getGroupMemberByUser } from '@/services/groupMemberService';
import { clearSession, loadSession, type AppSession } from '@/services/sessionService';

const API_BASE_URL = 'http://10.0.0.115:5249';

type MyGroup = {
  groupId: string;
  groupName: string;
};

function mapGroups(raw: unknown): MyGroup[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const entry = item as {
        groupId?: string;
        id?: string;
        familyGroupId?: string;
        groupName?: string;
        name?: string;
      };

      const groupId = String(entry.groupId ?? entry.familyGroupId ?? entry.id ?? '').trim();
      const groupName = String(entry.groupName ?? entry.name ?? '').trim();

      if (!groupId) return null;

      return {
        groupId,
        groupName: groupName || 'Unnamed Group',
      };
    })
    .filter((group): group is MyGroup => group !== null);
}

export default function MyGroupsScreen() {
  const { setActiveGroup, clearActiveGroup } = useActiveGroupContext();
  const [session, setSession] = useState<AppSession | null>(null);
  const [groups, setGroups] = useState<MyGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      setLoadingGroups(true);
      setGroupsError(null);

      const existingSession = await loadSession();
      if (!existingSession) {
        if (!cancelled) {
          router.replace('/auth');
        }
        return;
      }

      if (!cancelled) {
        setSession(existingSession);
      }

      let response: Response;
      const url = `${API_BASE_URL}/api/familygroups/my/${existingSession.userId}`;
      console.log('[MyGroups] fetching', url);

      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });
      } catch {
        if (!cancelled) {
          setGroupsError('Could not reach the server. Check your network connection.');
          setLoadingGroups(false);
        }
        return;
      }

      console.log('[MyGroups] response status', response.status);

      if (!response.ok) {
        if (!cancelled) {
          setGroupsError(`Failed to load groups (error ${response.status}).`);
          setLoadingGroups(false);
        }
        return;
      }

      try {
        const rawData = (await response.json()) as unknown;
        console.log('[MyGroups] raw response', rawData);
        if (!cancelled) {
          const mapped = mapGroups(rawData);
          console.log('[MyGroups] mapped groups count', mapped.length);
          setGroups(mapped);
          setLoadingGroups(false);
        }
      } catch {
        if (!cancelled) {
          setGroupsError('Failed to read group data from the server.');
          setLoadingGroups(false);
        }
      }
    }

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleJoinGroup = useCallback(() => {
    router.push('/join-group');
  }, []);

  const handleCreateGroup = useCallback(() => {
    router.push('/create-group');
  }, []);

  const handleLogout = useCallback(async () => {
    await clearSession();
    await clearActiveGroup();
    router.replace('/auth');
  }, [clearActiveGroup]);

  const handleOpenGroup = useCallback(
    async (group: MyGroup) => {
      const currentSession = await loadSession();

      const isSameGroup = currentSession?.groupId === group.groupId;
      let resolvedMemberId = isSameGroup ? String(currentSession?.memberId ?? '').trim() : '';
      let resolvedMemberName = isSameGroup
        ? String(currentSession?.memberName ?? currentSession?.displayName ?? '').trim()
        : '';

      if (currentSession?.userId) {
        try {
          const member = await getGroupMemberByUser(group.groupId, currentSession.userId);
          resolvedMemberId = String(member.memberId ?? '').trim();
          resolvedMemberName = String(member.displayName ?? currentSession.displayName ?? '').trim();
        } catch {
          // Allow entry to shell; provider and screens can continue resolution.
        }
      }

      await setActiveGroup({
        groupId: group.groupId,
        groupName: group.groupName,
        memberId: resolvedMemberId,
        memberName: resolvedMemberName,
      });

      router.push({
        pathname: '/(tabs)/(main)/family-home',
        params: {
          groupId: group.groupId,
          groupName: group.groupName,
          memberId: resolvedMemberId,
          memberName: resolvedMemberName,
        },
      });
    },
    [setActiveGroup]
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        My Groups
      </ThemedText>

      {session?.displayName ? (
        <ThemedText style={styles.welcome}>
          Welcome, {session.displayName}
        </ThemedText>
      ) : null}

      <ThemedView style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Your Groups
        </ThemedText>

        {loadingGroups ? (
          <ThemedText style={styles.emptyText}>Loading...</ThemedText>
        ) : groupsError ? (
          <ThemedText style={styles.errorText}>{groupsError}</ThemedText>
        ) : groups.length > 0 ? (
          groups.map((group) => (
            <Pressable
              key={group.groupId}
              style={styles.groupCard}
              onPress={() => void handleOpenGroup(group)}
            >
              <ThemedText type="defaultSemiBold" style={styles.groupCardName}>
                {group.groupName}
              </ThemedText>
              <ThemedText style={styles.groupCardSub}>
                Tap to open
              </ThemedText>
            </Pressable>
          ))
        ) : (
          <ThemedText style={styles.emptyText}>
            You have not joined any groups yet.
          </ThemedText>
        )}
      </ThemedView>

      <ThemedView style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={handleJoinGroup}>
          <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
            Join a Group
          </ThemedText>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleCreateGroup}>
          <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
            Create a Group
          </ThemedText>
        </Pressable>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <ThemedText type="defaultSemiBold" style={styles.logoutButtonText}>
            Log Out
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    gap: 20,
  },
  title: {
    fontSize: 32,
  },
  welcome: {
    fontSize: 16,
    marginTop: -12,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
  },
  groupCard: {
    borderWidth: 1,
    borderColor: '#BCC3CC',
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  groupCardName: {
    fontSize: 16,
  },
  groupCardSub: {
    fontSize: 13,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
  },
  errorText: {
    color: '#C0392B',
    fontSize: 14,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#0A7EA4',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0A7EA4',
  },
  secondaryButtonText: {
    color: '#0A7EA4',
    fontSize: 16,
  },
  logoutButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#C0392B',
    fontSize: 15,
  },
});
