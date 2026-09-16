import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_BASE_URL } from '@/config/api';
import { AnnouncementCard, type AnnouncementCardItem } from '@/components/announcement-card';
import { ActivePollCard, type ActivePollCardItem } from '@/components/active-poll-card';
import { DashboardSection, type DashboardCardItem } from '@/components/dashboard-section';
import { FamilyMembersSection } from '@/components/family-members-section';
import { KickbackCard, type KickbackCardItem } from '@/components/kickback-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UpcomingEventCard, type UpcomingEventCardItem } from '@/components/upcoming-event-card';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { getAnnouncementsByGroup } from '@/services/announcementService';
import { getEventsByGroup, type Event } from '@/services/eventService';
import { getGroupMemberByUser, getGroupMembers, type GroupMember } from '@/services/groupMemberService';
import { getKickbacksByGroup } from '@/services/kickbackService';
import { getPollsByGroup } from '@/services/pollService';
import { clearSession, loadSession, setMemberInfo } from '@/services/sessionService';

const PREVIEW_LIMIT = 5;

type MyGroupPreview = {
  groupId: string;
  groupName: string;
};

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

function toBodyPreview(text: string, maxLength = 96): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 3)}...`;
}

function mapUpcomingEvents(events: Event[]): UpcomingEventCardItem[] {
  const previewEvents = events.slice(0, PREVIEW_LIMIT);
  const nextUpEventId = previewEvents.reduce<string | null>((closestEventId, event) => {
    const parsedDate = new Date(event.startDate);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.getTime() < Date.now()) {
      return closestEventId;
    }

    if (!closestEventId) {
      return event.id;
    }

    const closestEvent = previewEvents.find((previewEvent) => previewEvent.id === closestEventId);
    const closestDate = closestEvent ? new Date(closestEvent.startDate) : null;

    if (!closestDate || Number.isNaN(closestDate.getTime()) || parsedDate.getTime() < closestDate.getTime()) {
      return event.id;
    }

    return closestEventId;
  }, null);

  return previewEvents.map((event) => ({
    id: event.id,
    title: event.title || 'Untitled Event',
    startDate: event.startDate,
    location: event.location?.trim() || undefined,
    host: event.creatorDisplayName?.trim() || undefined,
    participantCount: event.assignments?.length,
    isNextUp: event.id === nextUpEventId,
  }));
}

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || '?';
}

export default function FamilyHomeScreen() {
  const insets = useSafeAreaInsets();
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
  const [membersPreview, setMembersPreview] = useState<GroupMember[]>([]);
  const [announcementsPreview, setAnnouncementsPreview] = useState<AnnouncementCardItem[]>([]);
  const [pollsPreview, setPollsPreview] = useState<ActivePollCardItem[]>([]);
  const [kickbacksPreview, setKickbacksPreview] = useState<KickbackCardItem[]>([]);
  const [eventsPreview, setEventsPreview] = useState<UpcomingEventCardItem[]>([]);
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
      const session = await loadSession();
      if (!session) {
        router.replace('/auth');
        return;
      }

      if (!memberName && session.displayName) {
        setMemberName(session.displayName);
      }

      if (!groupId) return;

      // If we already have a memberId from params/session, keep it
      if (memberId) {
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
      : Promise.resolve([] as GroupMember[]);

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

    setMembersPreview(membersData.slice(0, PREVIEW_LIMIT));

    setAnnouncementsPreview(
      announcementsData.slice(0, PREVIEW_LIMIT).map((announcement) => ({
        id: announcement.id,
        title: announcement.title || 'Untitled Announcement',
        message: toBodyPreview(announcement.body),
        author: announcement.creatorDisplayName?.trim() || undefined,
      }))
    );

    setPollsPreview(
      pollsData.slice(0, PREVIEW_LIMIT).map((poll) => ({
        id: poll.id,
        title: poll.question || 'Untitled Poll',
        optionCount: poll.options.length > 0 ? poll.options.length : undefined,
        voteCount:
          poll.options.length > 0
            ? poll.options.reduce((total, option) => total + option.voteCount, 0)
            : undefined,
      }))
    );

    setKickbacksPreview(
      kickbacksData.slice(0, PREVIEW_LIMIT).map((kickback) => ({
        id: kickback.id,
        title: kickback.vibe || 'Kickback',
        note: toBodyPreview(kickback.note ?? 'No note yet.'),
        expiresAtUtc: kickback.expiresAtUtc,
        creator: kickback.creatorDisplayName?.trim() || undefined,
        pullingUpCount: kickback.pullingUpCount,
        maybeCount: kickback.maybeCount,
        currentMemberResponse: kickback.currentMemberResponse,
      }))
    );

    setEventsPreview(mapUpcomingEvents(eventsData));

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
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
          <View style={styles.headerCopy}>
            <ThemedText type="title" style={styles.title}>
              Family Home
            </ThemedText>
            <ThemedText type="subtitle" style={styles.greeting}>
              Good morning, {memberName || 'there'}!
            </ThemedText>
            <ThemedText style={styles.supportingMessage}>Great families make great memories 💙</ThemedText>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Open notifications"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => router.push('/(tabs)/(main)/activity')}
              style={styles.iconButton}
            >
              <MaterialIcons name="notifications-none" size={26} color="#174B5C" />
            </Pressable>
            <Pressable
              accessibilityLabel="Open profile"
              accessibilityRole="button"
              hitSlop={6}
              onPress={() => router.push('/(tabs)/(main)/my-groups')}
              style={styles.profileButton}
            >
              <ThemedText style={styles.profileInitials}>{getInitials(memberName)}</ThemedText>
            </Pressable>
          </View>
        </View>

        <FamilyMembersSection
          members={membersPreview}
          currentMemberId={memberId}
          loading={loadingPreviews}
          onViewAll={() => router.push('/(tabs)/(main)/members')}
          onInvite={() => router.push('/join-group')}
        />

        <DashboardSection
          title="My Groups"
          items={myGroupsPreview}
          loading={loadingPreviews}
          emptyText="No groups to preview yet."
          onViewAll={() => router.push('/(tabs)/(main)/my-groups')}
        />

        <DashboardSection
          title="Announcements"
          items={announcementsPreview}
          loading={loadingPreviews}
          emptyText="No announcements to preview yet."
          onViewAll={() => router.push('/(tabs)/(main)/announcements')}
          onCardPress={() => router.push('/(tabs)/(main)/announcements')}
          renderCard={(item) => (
            <AnnouncementCard
              item={item}
              onPress={() => router.push('/(tabs)/(main)/announcements')}
            />
          )}
        />

        <DashboardSection
          title="Polls"
          items={pollsPreview}
          loading={loadingPreviews}
          emptyText="No polls to preview yet."
          onViewAll={() => router.push('/(tabs)/(main)/polls')}
          onCardPress={() => router.push('/(tabs)/(main)/polls')}
          renderCard={(item, index) => (
            <ActivePollCard
              item={item}
              index={index}
              onPress={() => router.push('/(tabs)/(main)/polls')}
            />
          )}
        />

        <DashboardSection
          title="Recent Kickbacks"
          items={kickbacksPreview}
          loading={loadingPreviews}
          emptyText="No kickbacks to preview yet."
          onViewAll={() => router.push('/(tabs)/(main)/kickbacks')}
          onCardPress={() => router.push('/(tabs)/(main)/kickbacks')}
          renderCard={(item, index) => (
            <KickbackCard
              item={item}
              index={index}
              onPress={() => router.push('/(tabs)/(main)/kickbacks')}
            />
          )}
        />

        <DashboardSection
          title="Upcoming Events"
          items={eventsPreview}
          loading={loadingPreviews}
          emptyText="No events to preview yet."
          onViewAll={() => router.push('/(tabs)/(main)/events')}
          onCardPress={(item) => router.push({ pathname: '/event/[eventId]', params: { eventId: String(item.id) } })}
          renderCard={(item, index) => (
            <UpcomingEventCard
              item={item}
              index={index}
              onPress={() => router.push({ pathname: '/event/[eventId]', params: { eventId: String(item.id) } })}
            />
          )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  headerCopy: {
    flex: 1,
    gap: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  title: {
    textAlign: 'left',
    fontSize: 32,
    lineHeight: 36,
  },
  greeting: {
    fontSize: 20,
    lineHeight: 26,
  },
  supportingMessage: {
    color: '#687076',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  profileButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCEAF0',
  },
  profileInitials: {
    color: '#174B5C',
    fontSize: 14,
    fontWeight: '700',
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
