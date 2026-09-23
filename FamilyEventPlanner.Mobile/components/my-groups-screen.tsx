import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { API_BASE_URL } from '@/config/api';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { getGroupMemberByUser } from '@/services/groupMemberService';
import { clearSession, loadSession, type AppSession } from '@/services/sessionService';

type MyGroup = {
  groupId: string;
  groupName: string;
  memberCount?: number;
};

function mapGroups(raw: unknown): MyGroup[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item): MyGroup | null => {
      const entry = item as {
        groupId?: string;
        id?: string;
        familyGroupId?: string;
        groupName?: string;
        name?: string;
        memberCount?: number;
      };
      const groupId = String(entry.groupId ?? entry.familyGroupId ?? entry.id ?? '').trim();
      if (!groupId) return null;

      return {
        groupId,
        groupName: String(entry.groupName ?? entry.name ?? '').trim() || 'Unnamed Group',
        memberCount: typeof entry.memberCount === 'number' ? entry.memberCount : undefined,
      };
    })
    .filter((group): group is MyGroup => group !== null);
}

function GroupCard({ group, onPress }: { group: MyGroup; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${group.groupName}`}
      onPress={onPress}
      style={({ pressed }) => [styles.groupCard, pressed && styles.pressed]}
    >
      <View style={styles.groupVisual}>
        <MaterialIcons name="groups" size={42} color="#0A91B2" />
      </View>
      <View style={styles.groupInfo}>
        <ThemedText type="defaultSemiBold" style={styles.groupName} numberOfLines={1}>
          {group.groupName}
        </ThemedText>
        <ThemedText style={styles.groupMeta}>
          {group.memberCount === undefined
            ? 'Family group'
            : `${group.memberCount} member${group.memberCount === 1 ? '' : 's'}`}
        </ThemedText>
        <View style={styles.groupHint}>
          <MaterialIcons name="event" size={17} color="#52677A" />
          <ThemedText style={styles.groupHintText}>Plan moments together</ThemedText>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={30} color="#52677A" />
    </Pressable>
  );
}

function ActionCard({
  icon,
  title,
  description,
  color,
  onPress,
}: {
  icon: 'group-add' | 'add';
  title: string;
  description: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, { backgroundColor: color }, pressed && styles.pressed]}
    >
      <View style={styles.actionIcon}>
        <MaterialIcons name={icon} size={30} color="#087D9F" />
      </View>
      <ThemedText type="defaultSemiBold" style={styles.actionTitle}>
        {title}
      </ThemedText>
      <ThemedText style={styles.actionDescription}>{description}</ThemedText>
      <View style={styles.actionArrow}>
        <MaterialIcons name="arrow-forward" size={25} color="#087D9F" />
      </View>
    </Pressable>
  );
}

export default function MyGroupsScreen() {
  const { setActiveGroup, clearActiveGroup, refreshMembership } = useActiveGroupContext();
  const [session, setSession] = useState<AppSession | null>(null);
  const [groups, setGroups] = useState<MyGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const loadGroups = useCallback(async (cancelled: () => boolean) => {
    const existingSession = await loadSession();
    if (!existingSession) {
      router.replace('/auth');
      return;
    }
    if (cancelled()) return;
    setSession(existingSession);

    try {
      const response = await fetch(`${API_BASE_URL}/api/familygroups/my/${existingSession.userId}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Failed to load groups (error ${response.status}).`);
      const mapped = mapGroups(await response.json());
      if (!cancelled()) setGroups(mapped);
    } catch (error) {
      if (!cancelled()) {
        setGroupsError(error instanceof Error ? error.message : 'Could not load your groups.');
      }
    } finally {
      if (!cancelled()) setLoadingGroups(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoadingGroups(true);
      setGroupsError(null);
      void refreshMembership();
      void loadGroups(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [loadGroups, refreshMembership])
  );

  const handleOpenGroup = useCallback(
    async (group: MyGroup) => {
      const currentSession = await loadSession();
      let memberId = currentSession?.groupId === group.groupId ? String(currentSession.memberId ?? '') : '';
      let memberName =
        currentSession?.groupId === group.groupId
          ? String(currentSession.memberName ?? currentSession.displayName ?? '')
          : '';

      if (currentSession?.userId) {
        try {
          const member = await getGroupMemberByUser(group.groupId, currentSession.userId);
          memberId = String(member.memberId ?? '');
          memberName = String(member.displayName ?? currentSession.displayName ?? '');
        } catch {
          // The family home can resolve the member if this lookup is unavailable.
        }
      }

      await setActiveGroup({ groupId: group.groupId, groupName: group.groupName, memberId, memberName });
      router.push({
        pathname: '/(tabs)/(main)/family-home',
        params: { groupId: group.groupId, groupName: group.groupName, memberId, memberName },
      });
    },
    [setActiveGroup]
  );

  const handleLogout = useCallback(async () => {
    await clearActiveGroup();
    await clearSession();
    router.replace('/auth');
  }, [clearActiveGroup]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <MaterialIcons name="groups" size={25} color="#0A91B2" />
          </View>
          <ThemedText type="defaultSemiBold" style={styles.brand}>
            Huddle Up
          </ThemedText>
        </View>

        <ThemedText type="title" style={styles.title}>
          My Groups
        </ThemedText>
        <ThemedText style={styles.welcome}>
          Welcome, {session?.displayName || 'friend'} 👋
        </ThemedText>
        <ThemedText style={styles.subtitle}>Family moments are better together.</ThemedText>

        <View style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Your Groups
          </ThemedText>
          {groups.length > 0 ? <ThemedText style={styles.seeAll}>See all ›</ThemedText> : null}
        </View>

        {loadingGroups ? (
          <ThemedText style={styles.statusText}>Loading your groups...</ThemedText>
        ) : groupsError ? (
          <ThemedText style={styles.errorText}>{groupsError}</ThemedText>
        ) : groups.length > 0 ? (
          groups.map((group) => <GroupCard key={group.groupId} group={group} onPress={() => void handleOpenGroup(group)} />)
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name="favorite-border" size={30} color="#E86B91" />
            </View>
            <MaterialIcons name="groups" size={70} color="#0A91B2" />
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
              You&apos;re not in any groups yet.
            </ThemedText>
            <ThemedText style={styles.emptyDescription}>
              Join an existing group or create your own to start planning and sharing together.
            </ThemedText>
          </View>
        )}

        <View style={styles.actions}>
          <ActionCard
            icon="group-add"
            title="Join a Group"
            description="Have an invite code? Join an existing group."
            color="#E8FAF3"
            onPress={() => router.push('/join-group')}
          />
          <ActionCard
            icon="add"
            title="Create a Group"
            description="Start a new group for your family or friends."
            color="#EAF5FF"
            onPress={() => router.push('/create-group')}
          />
        </View>

        <ThemedText style={styles.footer}>Family. Friends. Moments. Together.</ThemedText>
        <Pressable accessibilityRole="button" onPress={() => void handleLogout()} style={styles.logout}>
          <ThemedText style={styles.logoutText}>Log Out</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6FBFF' },
  container: { paddingHorizontal: 22, paddingBottom: 28, gap: 8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  brandIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#DDF5FA', alignItems: 'center', justifyContent: 'center' },
  brand: { color: '#102A3D', fontSize: 23 },
  title: { color: '#102A3D', fontSize: 42, lineHeight: 48, marginTop: 4 },
  welcome: { color: '#5D6D7D', fontSize: 21, fontWeight: '600', marginTop: 4 },
  subtitle: { color: '#6C7D8E', fontSize: 17, marginBottom: 22 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { color: '#102A3D', fontSize: 25 },
  seeAll: { color: '#087D9F', fontSize: 17, fontWeight: '700' },
  statusText: { color: '#6C7D8E', paddingVertical: 18 },
  errorText: { color: '#B13E4B', paddingVertical: 18 },
  groupCard: {
    minHeight: 136,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 15,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#66839A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  pressed: { opacity: 0.8 },
  groupVisual: { width: 94, height: 106, borderRadius: 18, backgroundColor: '#DDF5FA', alignItems: 'center', justifyContent: 'center' },
  groupInfo: { flex: 1, gap: 5 },
  groupName: { color: '#102A3D', fontSize: 20 },
  groupMeta: { color: '#52677A', fontSize: 16 },
  groupHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  groupHintText: { color: '#52677A', fontSize: 13 },
  emptyState: { alignItems: 'center', paddingTop: 28, paddingBottom: 22 },
  emptyIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#FCE9F0', alignItems: 'center', justifyContent: 'center', marginBottom: -3 },
  emptyTitle: { color: '#102A3D', fontSize: 21, marginTop: 4, textAlign: 'center' },
  emptyDescription: { color: '#6C7D8E', fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 330, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 2 },
  actionCard: { flex: 1, minHeight: 190, borderRadius: 22, padding: 16, position: 'relative' },
  actionIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionTitle: { color: '#102A3D', fontSize: 18 },
  actionDescription: { color: '#5D6D7D', fontSize: 14, lineHeight: 20, marginTop: 5, paddingRight: 4 },
  actionArrow: { position: 'absolute', right: 13, bottom: 14, width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  footer: { color: '#6C7D8E', fontSize: 16, textAlign: 'center', marginTop: 22 },
  logout: { alignSelf: 'center', padding: 12, marginTop: 4 },
  logoutText: { color: '#B13E4B', fontSize: 14, fontWeight: '600' },
});
