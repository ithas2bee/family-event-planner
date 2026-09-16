import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DashboardSection, type DashboardCardItem } from '@/components/dashboard-section';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { getAnnouncementsByGroup } from '@/services/announcementService';
import { getEventsByGroup } from '@/services/eventService';
import { getGroupMemberByUser, getGroupMembers } from '@/services/groupMemberService';
import { getKickbacksByGroup } from '@/services/kickbackService';
import { getPollsByGroup } from '@/services/pollService';
import { clearSession, loadSession, setMemberInfo } from '@/services/sessionService';

const API_BASE_URL = 'http://10.0.0.115:5249';
const PREVIEW_LIMIT = 5;

type MyGroupPreview = {
  groupId: string;
  groupName: string;
};

function PollCard({ item }: { item: DashboardCardItem }) {
  const optionCount = item.pollOptionCount;
  const voteCount = item.pollVoteCount;
  const details = [
    optionCount !== undefined ? `${optionCount} option${optionCount === 1 ? '' : 's'}` : null,
    voteCount !== undefined ? `${voteCount} vote${voteCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' • ');
  const accessibilityLabel = [item.title, 'poll', details].filter(Boolean).join('. ');

  return (
    <Pressable
      style={({ pressed }) => [styles.pollCard, pressed && styles.pollCardPressed]}
      onPress={() => router.push('/(tabs)/(main)/polls')}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      <View style={styles.pollHeader}>
        <View style={styles.pollIcon}>
          <Ionicons name="bar-chart" size={24} color="#2563EB" />
        </View>
        <View style={styles.pollHeaderCopy}>
          <ThemedText style={styles.pollEyebrow}>FAMILY DECISION</ThemedText>
          <ThemedText style={styles.pollPrompt} numberOfLines={2}>
            {item.title}
          </ThemedText>
        </View>
        <View style={styles.pollArrow}>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </View>
      </View>
      {details ? <ThemedText style={styles.pollDetails} numberOfLines={1}>{details}</ThemedText> : null}
    </Pressable>
  );
}

function mapGroups(raw: unknown): MyGroupPreview[] {
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

      const id = String(entry.groupId ?? entry.familyGroupId ?? entry.id ?? '').trim();
      const name = String(entry.groupName ?? entry.name ?? '').trim();
      if (!id) {
        return null;
      }

      return {
        groupId: id,
        groupName: name || 'Unnamed Group',
      };
    })
    .filter((group): group is MyGroupPreview => group !== null);
}

function toBodyPreview(text: string, maxLength = 72): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 3)}...`;
}

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

  const [myGroupsPreview, setMyGroupsPreview] = useState<DashboardCardItem[]>([]);
  const [membersPreview, setMembersPreview] = useState<DashboardCardItem[]>([]);
  const [announcementsPreview, setAnnouncementsPreview] = useState<DashboardCardItem[]>([]);
  const [pollsPreview, setPollsPreview] = useState<DashboardCardItem[]>([]);
  const [kickbacksPreview, setKickbacksPreview] = useState<DashboardCardItem[]>([]);
  const [eventsPreview, setEventsPreview] = useState<DashboardCardItem[]>([]);
  const [loadingPreviews, setLoadingPreviews] = useState(false);

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

    void resolveMember();

    return () => {
      cancelled = true;
    };
  }, [groupId, memberId, memberName, setActiveGroup]);

  const loadDashboardPreviews = useCallback(async (cancelledRef: { cancelled: boolean }) => {
    if (!groupId) {
      return;
    }

    setLoadingPreviews(true);

    const session = await loadSession();
    if (!session) {
      if (!cancelledRef.cancelled) {
        setLoadingPreviews(false);
      }
      return;
    }

    const groupsPromise = fetch(`${API_BASE_URL}/api/familygroups/my/${session.userId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          return [] as MyGroupPreview[];
        }

        const raw = (await response.json()) as unknown;
        return mapGroups(raw);
      })
      .catch(() => [] as MyGroupPreview[]);

    const membersPromise = memberId
      ? getGroupMembers(groupId, memberId).catch(() => [])
      : Promise.resolve([] as Array<{ memberId?: string; displayName?: string; isAdmin?: boolean }>);

    const [groupsData, membersData, announcementsData, pollsData, kickbacksData, eventsData] =
      await Promise.all([
        groupsPromise,
        membersPromise,
        getAnnouncementsByGroup(groupId).catch(() => []),
        getPollsByGroup(groupId).catch(() => []),
        getKickbacksByGroup(groupId).catch(() => []),
        getEventsByGroup(groupId).catch(() => []),
      ]);

    if (cancelledRef.cancelled) {
      return;
    }

    setMyGroupsPreview(
      groupsData.slice(0, PREVIEW_LIMIT).map((group) => ({
        id: group.groupId,
        title: group.groupName,
        subtitle: group.groupId === groupId ? 'Active group' : 'Available group',
      }))
    );

    setMembersPreview(
      membersData.slice(0, PREVIEW_LIMIT).map((member, index) => ({
        id: String(member.memberId ?? index),
        title: String(member.displayName ?? 'Unknown Member'),
        subtitle: member.isAdmin ? 'Admin' : 'Member',
      }))
    );

    setAnnouncementsPreview(
      announcementsData.slice(0, PREVIEW_LIMIT).map((announcement) => ({
        id: announcement.id,
        title: announcement.title || 'Untitled Announcement',
        subtitle: toBodyPreview(announcement.body),
        meta: announcement.creatorDisplayName || 'Unknown Member',
      }))
    );

    setPollsPreview(
      pollsData.slice(0, PREVIEW_LIMIT).map((poll) => ({
        id: poll.id,
        title: poll.question || 'Untitled Poll',
      pollOptionCount: poll.optionsAvailable ? poll.options.length : undefined,
      pollVoteCount: poll.optionsAvailable && poll.options.every((option) => option.voteCount !== undefined)
        ? poll.options.reduce((total, option) => total + (option.voteCount ?? 0), 0)
        : undefined,
    }))
    );

    setKickbacksPreview(
      kickbacksData.slice(0, PREVIEW_LIMIT).map((kickback) => ({
        id: kickback.id,
        title: kickback.vibe || 'Kickback',
        subtitle: toBodyPreview(kickback.note ?? 'No note yet.'),
        meta: `${kickback.pullingUpCount} pulling up | ${kickback.maybeCount} maybe`,
      }))
    );

    setEventsPreview(
      eventsData.slice(0, PREVIEW_LIMIT).map((event) => ({
        id: event.id,
        title: event.title || 'Untitled Event',
        subtitle: event.location || 'No location set',
        meta: event.startDate,
      }))
    );

    setLoadingPreviews(false);
  }, [groupId, memberId]);

  useFocusEffect(
    useCallback(() => {
      const cancelledRef = { cancelled: false };
      void loadDashboardPreviews(cancelledRef);

      return () => {
        cancelledRef.cancelled = true;
      };
    }, [loadDashboardPreviews])
  );

  const handleLogout = async () => {
    await clearSession();
    await clearActiveGroup();
    router.replace('/auth');
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          Family Home
        </ThemedText>

        <View style={styles.infoGroup}>
          <ThemedText type="defaultSemiBold">Welcome to {groupName || 'Unknown Group'}</ThemedText>
          <ThemedText>Hello, {memberName || 'Unknown Member'}</ThemedText>
        </View>

        <DashboardSection
          title="My Groups"
          items={myGroupsPreview}
          loading={loadingPreviews}
          emptyText="No groups to preview yet."
          onViewAll={() => router.push('/(tabs)/(main)/my-groups')}
        />

        <DashboardSection
          title="Members"
          items={membersPreview}
          loading={loadingPreviews}
          emptyText="No members to preview yet."
          onViewAll={() => router.push('/(tabs)/(main)/members')}
        />

        <DashboardSection
          title="Announcements"
          items={announcementsPreview}
          loading={loadingPreviews}
          emptyText="No announcements to preview yet."
          onViewAll={() => router.push('/(tabs)/(main)/announcements')}
        />

        <DashboardSection
          title="Active Polls"
          items={pollsPreview}
          loading={loadingPreviews}
          emptyText="No polls to preview yet."
          onViewAll={() => router.push('/(tabs)/(main)/polls')}
          onCardPress={() => router.push('/(tabs)/(main)/polls')}
          renderCard={(item) => <PollCard item={item} />}
        />

        <DashboardSection
          title="Kickbacks"
          items={kickbacksPreview}
          loading={loadingPreviews}
          emptyText="No kickbacks to preview yet."
          onViewAll={() => router.push('/(tabs)/(main)/kickbacks')}
        />

        <DashboardSection
          title="Events"
          items={eventsPreview}
          loading={loadingPreviews}
          emptyText="No events to preview yet."
          onViewAll={() => router.push('/(tabs)/(main)/events')}
          onCardPress={(item) => router.push({ pathname: '/event/[eventId]', params: { eventId: String(item.id) } })}
        />

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <ThemedText type="defaultSemiBold" style={styles.logoutButtonText}>
            Logout
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    gap: 20,
    padding: 20,
    paddingBottom: 28,
  },
  title: {
    textAlign: 'left',
    fontSize: 30,
    lineHeight: 34,
  },
  infoGroup: {
    alignItems: 'flex-start',
    gap: 4,
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
  pollCard: {
    width: 280,
    minHeight: 134,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  pollCardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  pollHeader: {
    minHeight: 92,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#172554',
  },
  pollIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
  },
  pollHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  pollEyebrow: {
    color: '#BFDBFE',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  pollPrompt: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },
  pollArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  pollDetails: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
});
