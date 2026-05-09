import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getGroupMemberByUser } from '@/services/groupMemberService';
import { clearSession, loadSession, setMemberInfo } from '@/services/sessionService';

export default function FamilyHomeScreen() {
  const params = useLocalSearchParams();
  const groupName = String(params.groupName ?? '');
  const initialMemberName = String(params.memberName ?? '');
  const groupId = String(params.groupId ?? '');
  const initialMemberId = String(params.memberId ?? '');

  const [memberName, setMemberName] = useState(initialMemberName);
  const [memberId, setMemberId] = useState(initialMemberId);

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
  }, [groupId]);

  const handleLogout = async () => {
    await clearSession();
    router.replace('/(tabs)');
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
          onPress={() =>
            router.push({ pathname: '/announcements', params: { groupId, memberId } })
          }>
          <ThemedText type="defaultSemiBold" style={styles.navButtonText}>
            Announcements
          </ThemedText>
        </Pressable>

        <Pressable
          style={styles.navButton}
          onPress={() =>
            router.push({ pathname: '/events', params: { groupId, memberId } })
          }>
          <ThemedText type="defaultSemiBold" style={styles.navButtonText}>
            Events
          </ThemedText>
        </Pressable>

        <Pressable
          style={styles.navButton}
          onPress={() =>
            router.push({ pathname: '/polls', params: { groupId, memberId } })
          }>
          <ThemedText type="defaultSemiBold" style={styles.navButtonText}>
            Polls
          </ThemedText>
        </Pressable>

        <Pressable
          style={styles.navButton}
          onPress={() =>
            router.push({ pathname: '/activity', params: { groupId, memberId } })
          }>
          <ThemedText type="defaultSemiBold" style={styles.navButtonText}>
            Activity
          </ThemedText>
        </Pressable>

        <Pressable
          style={styles.navButton}
          onPress={() =>
            router.push({ pathname: '/members', params: { groupId, memberId } })
          }>
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
