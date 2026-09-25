import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GroupCard, mapGroups, type MyGroup } from '@/components/my-groups-screen';
import { ThemedText } from '@/components/themed-text';
import { API_BASE_URL } from '@/config/api';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { getGroupMemberByUser } from '@/services/groupMemberService';
import { loadSession } from '@/services/sessionService';

export default function AllGroupsScreen() {
  const { groupId: activeGroupId, setActiveGroup } = useActiveGroupContext();
  const [groups, setGroups] = useState<MyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(async (cancelled: () => boolean) => {
    const session = await loadSession();
    if (!session) {
      router.replace('/auth');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/familygroups/my/${session.userId}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Failed to load groups (error ${response.status}).`);
      if (!cancelled()) setGroups(mapGroups(await response.json()));
    } catch (loadError) {
      if (!cancelled()) {
        setError(loadError instanceof Error ? loadError.message : 'Could not load your groups.');
      }
    } finally {
      if (!cancelled()) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);
      void loadGroups(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [loadGroups])
  );

  const openGroup = useCallback(
    async (group: MyGroup) => {
      const session = await loadSession();
      if (!session) {
        router.replace('/auth');
        return;
      }

      let memberId = '';
      let memberName = session.displayName;
      try {
        const member = await getGroupMemberByUser(group.groupId, session.userId);
        memberId = String(member.memberId ?? '');
        memberName = String(member.displayName ?? session.displayName);
      } catch {
        // The destination can resolve the member if this lookup is unavailable.
      }

      await setActiveGroup({ groupId: group.groupId, groupName: group.groupName, memberId, memberName });
      router.push({
        pathname: '/(tabs)/(main)/family-home',
        params: { groupId: group.groupId, groupName: group.groupName, memberId, memberName },
      });
    },
    [setActiveGroup]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to My Groups"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#102A3D" />
          <ThemedText style={styles.backText}>Back</ThemedText>
        </Pressable>
        <ThemedText type="title" style={styles.title}>All Groups</ThemedText>
        <ThemedText style={styles.subtitle}>Groups you&apos;re part of</ThemedText>

        {loading ? <ThemedText style={styles.statusText}>Loading your groups...</ThemedText> : null}
        {!loading && error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
        {!loading && !error && groups.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="groups" size={64} color="#0A91B2" />
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>You&apos;re not in any groups yet.</ThemedText>
            <ThemedText style={styles.emptyDescription}>Join or create a group to see it here.</ThemedText>
          </View>
        ) : null}
        {!loading && !error
          ? groups.map((group) => (
              <GroupCard
                key={group.groupId}
                group={group}
                isActive={group.groupId === activeGroupId}
                onPress={() => void openGroup(group)}
              />
            ))
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6FBFF' },
  container: { paddingHorizontal: 22, paddingBottom: 28, gap: 10 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  backText: { color: '#102A3D', fontSize: 16, fontWeight: '600' },
  title: { color: '#102A3D', fontSize: 40, lineHeight: 48, marginTop: 8 },
  subtitle: { color: '#6C7D8E', fontSize: 18, marginBottom: 12 },
  statusText: { color: '#6C7D8E', paddingVertical: 18 },
  errorText: { color: '#B13E4B', paddingVertical: 18 },
  emptyState: { alignItems: 'center', paddingTop: 50, paddingBottom: 24 },
  emptyTitle: { color: '#102A3D', fontSize: 21, marginTop: 12, textAlign: 'center' },
  emptyDescription: { color: '#6C7D8E', fontSize: 16, marginTop: 6 },
});
