import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { getGroupMemberByUser } from '@/services/groupMemberService';
import { clearSession, loadSession, setMemberInfo } from '@/services/sessionService';

export default function FamilyHomeScreen() {
  const {
    groupId: contextGroupId,
    groupName: contextGroupName,
    memberId: contextMemberId,
    memberName: contextMemberName,
    setActiveGroup,
    clearActiveGroup,
  } = useActiveGroupContext();
  const params = useLocalSearchParams();
  const groupName = String(params.groupName ?? contextGroupName ?? '');
  const initialMemberName = String(params.memberName ?? contextMemberName ?? '');
  const groupId = String(params.groupId ?? contextGroupId ?? '');
  const initialMemberId = String(params.memberId ?? contextMemberId ?? '');

  const [memberName, setMemberName] = useState(initialMemberName);
  const [memberId, setMemberId] = useState(initialMemberId);

  useEffect(() => {
    const update: { groupId?: string; groupName?: string; memberId?: string; memberName?: string } = {};
    if (groupId) {
      update.groupId = groupId;
    }
    if (groupName) {
      update.groupName = groupName;
    }
    if (initialMemberId) {
      update.memberId = initialMemberId;
    }
    if (initialMemberName) {
      update.memberName = initialMemberName;
    }

    if (Object.keys(update).length === 0) {
      return;
    }

    void setActiveGroup(update);
  }, [groupId, groupName, initialMemberId, initialMemberName, setActiveGroup]);

  useEffect(() => {
    let cancelled = false;

    async function resolveMember() {
      if (!groupId) return;

      const session = await loadSession();
      if (!session) {
        router.replace('/auth');
        return;
      }

      // If we already have a memberId from params/session, keep it
      if (memberId) {
        if (!memberName && session.displayName) setMemberName(session.displayName);
        return;
      }

      try {
        const res = await getGroupMemberByUser(groupId, session.userId);
        if (cancelled) return;

        if (res?.memberId) {
          setMemberId(res.memberId);
          setMemberName(res.displayName ?? session.displayName ?? '');
          await setActiveGroup({
            memberId: res.memberId,
            memberName: res.displayName ?? session.displayName ?? '',
            groupId: res.groupId ?? groupId,
          });
          // persist globally
          await setMemberInfo(res.memberId, res.displayName ?? session.displayName ?? '', res.groupId);
        }
      } catch (err) {
        // resolving member failed � keep showing fallback text.
        console.warn('Failed to resolve member for group:', err);
      }
    }

    resolveMember();

    return () => {
      cancelled = true;
    };
  }, [groupId, memberId, memberName, setActiveGroup]);

  const handleLogout = async () => {
    await clearSession();
    await clearActiveGroup();
    router.replace('/auth');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Family Home
      </ThemedText>

      <View style={styles.infoGroup}>
        <ThemedText type="defaultSemiBold">Welcome to {groupName || 'Unknown Group'}</ThemedText>
        <ThemedText>Hello, {memberName || 'Unknown Member'}</ThemedText>
        <ThemedText>Group ID: {groupId || 'Unknown'}</ThemedText>
        <ThemedText>Member ID: {memberId || 'Unknown'}</ThemedText>
      </View>

      <View style={styles.buttonGroup}>
        <Pressable
          style={styles.navButton}
          onPress={() => router.push('/(tabs)/(main)/announcements')}>
            <ThemedText type="defaultSemiBold" style={styles.navButtonText}>
            Announcements
          </ThemedText>
        </Pressable>

        <Pressable
          style={styles.navButton}
          onPress={() => router.push('/(tabs)/(main)/events')}>
          <ThemedText type="defaultSemiBold" style={styles.navButtonText}>
            Events
          </ThemedText>
        </Pressable>

        <Pressable
          style={styles.navButton}
            onPress={() => router.push('/(tabs)/(main)/polls')}>
          <ThemedText type="defaultSemiBold" style={styles.navButtonText}>
            Polls
          </ThemedText>
        </Pressable>

        <Pressable
          style={styles.navButton}
          onPress={() => router.push('/(tabs)/(main)/kickbacks')}>
          <ThemedText type="defaultSemiBold" style={styles.navButtonText}>
            Kickbacks
          </ThemedText>
        </Pressable>

        <Pressable
          style={styles.navButton}
            onPress={() => router.push('/(tabs)/(main)/members')}>
          <ThemedText type="defaultSemiBold" style={styles.navButtonText}>
            Members
          </ThemedText>
        </Pressable>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <ThemedText type="defaultSemiBold" style={styles.logoutButtonText}>
            Logout
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 24,
  },
  title: {
    textAlign: 'center',
    fontSize: 30,
    lineHeight: 34,
  },
  infoGroup: {
    alignItems: 'center',
    gap: 4,
  },
  buttonGroup: {
    gap: 12,
  },
  navButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#0A7EA4',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  logoutButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BCC3CC',
  },
  logoutButtonText: {
    fontSize: 16,
  },
});
