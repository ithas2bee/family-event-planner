import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import {
  getActivityByGroup,
  markAllNotificationsRead,
  type ActivityFeedItem,
} from '@/services/activityService';

type ActivityMetadata = {
  title?: string;
  question?: string;
  displayName?: string;
  vibe?: string;
  location?: string;
};

type NotificationCategory = 'All' | 'Events' | 'Kickbacks' | 'Groups' | 'Polls' | 'Announcements';

const categories: NotificationCategory[] = [
  'All',
  'Events',
  'Kickbacks',
  'Groups',
  'Polls',
  'Announcements',
];

function parseMetadata(metadataJson?: string): ActivityMetadata {
  if (!metadataJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(metadataJson) as ActivityMetadata;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function getCategory(item: ActivityFeedItem): NotificationCategory {
  if (item.activityType.startsWith('Event')) return 'Events';
  if (item.activityType.startsWith('Kickback')) return 'Kickbacks';
  if (item.activityType === 'MemberJoined' || item.activityType === 'GroupCreated') return 'Groups';
  if (item.activityType.startsWith('Poll')) return 'Polls';
  if (item.activityType.startsWith('Announcement')) return 'Announcements';
  return 'All';
}

function toSentence(item: ActivityFeedItem): string {
  const actor = item.actorDisplayName || 'Someone';
  const metadata = parseMetadata(item.metadataJson);

  if (item.activityType === 'EventCreated') {
    const title = metadata.title?.trim();
    return title ? `${actor} created event ${title}` : `${actor} created an event`;
  }

  if (item.activityType === 'PollVoted') {
    const question = metadata.question?.trim();
    return question ? `${actor} voted in poll ${question}` : `${actor} voted in a poll`;
  }

  if (item.activityType === 'AnnouncementCreated') {
    return `${actor} posted an announcement`;
  }

  if (item.activityType === 'MemberJoined') {
    const displayName = metadata.displayName?.trim();
    if (displayName && displayName !== actor) {
      return `${displayName} joined the group`;
    }
    return `${actor} joined the group`;
  }

  if (item.activityType === 'PollCreated') {
    const question = metadata.question?.trim();
    return question ? `${actor} created poll ${question}` : `${actor} created a poll`;
  }

  return `${actor} did ${item.activityType || 'an activity'}`;
}

function getNotificationText(item: ActivityFeedItem): string {
  const backendMessage = item.message?.trim();
  if (backendMessage && backendMessage.length > 0) {
    return backendMessage;
  }

  return toSentence(item);
}

function getActivityDetails(item: ActivityFeedItem) {
  const metadata = parseMetadata(item.metadataJson);
  const category = getCategory(item);

  if (category === 'Events') {
    return { title: metadata.title, detail: 'created an event', icon: 'event' as const };
  }
  if (category === 'Kickbacks') {
    return { title: metadata.vibe, detail: 'shared a Kickback', icon: 'bolt' as const };
  }
  if (category === 'Polls') {
    return { title: metadata.question, detail: 'posted a poll', icon: 'poll' as const };
  }
  if (category === 'Groups') {
    return { title: metadata.displayName, detail: 'joined the group', icon: 'groups' as const };
  }
  if (category === 'Announcements') {
    return { title: metadata.title, detail: 'posted an announcement', icon: 'campaign' as const };
  }
  return { title: undefined, detail: 'shared an update', icon: 'notifications' as const };
}

function getRelativeTime(createdAtUtc: string): string {
  const createdAt = new Date(createdAtUtc);
  if (Number.isNaN(createdAt.getTime())) return 'Recently';

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 60000));
  if (elapsedMinutes < 1) return 'Just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  if (elapsedMinutes < 24 * 60) return `${Math.floor(elapsedMinutes / 60)}h ago`;
  if (elapsedMinutes < 48 * 60) return 'Yesterday';
  return createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getTimeGroup(createdAtUtc: string): 'Today' | 'Yesterday' | 'This Week' | 'Earlier' {
  const createdAt = new Date(createdAtUtc);
  if (Number.isNaN(createdAt.getTime())) return 'Earlier';

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfCreatedAt = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
  const daysAgo = Math.floor((startOfToday.getTime() - startOfCreatedAt.getTime()) / 86400000);

  if (daysAgo <= 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  if (daysAgo <= 7) return 'This Week';
  return 'Earlier';
}

export default function ActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('All');
  const [markingRead, setMarkingRead] = useState(false);

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
    let cancelled = false;

    async function loadActivity() {
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
        const data = await getActivityByGroup(groupIdValue);
        if (!cancelled) {
          setActivities(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadActivity();

    return () => {
      cancelled = true;
    };
  }, [groupIdValue, memberIdValue, isReady, isResolvingMember]);

  const filteredActivities = activities.filter(
    (item) => selectedCategory === 'All' || getCategory(item) === selectedCategory,
  );
  const groupedActivities = ['Today', 'Yesterday', 'This Week', 'Earlier'].map((label) => ({
    label,
    items: filteredActivities.filter((item) => getTimeGroup(item.createdAtUtc) === label),
  }));

  function openActivity(item: ActivityFeedItem) {
    if (!item.relatedEntityId) return;

    if (item.relatedEntityType === 'Event') {
      router.push(`/event/${item.relatedEntityId}`);
    } else if (item.relatedEntityType === 'Kickback') {
      router.push('/kickbacks');
    } else if (item.relatedEntityType === 'Poll') {
      router.push('/polls');
    } else if (item.relatedEntityType === 'Announcement') {
      router.push('/announcements');
    } else if (item.relatedEntityType === 'Group') {
      router.push('/my-groups');
    }

  }

  async function markAllRead() {
    if (markingRead || memberIdValue.length === 0) return;
    setMarkingRead(true);
    try {
      await markAllNotificationsRead(memberIdValue);
    } catch {
      setError('Notifications could not be updated.');
    } finally {
      setMarkingRead(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: 24 + insets.top }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <ThemedText type="title" style={styles.title}>
              Notifications
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark all read"
              accessibilityState={{ busy: markingRead }}
              disabled={markingRead}
              onPress={() => void markAllRead()}
              style={styles.markReadButton}>
              <MaterialIcons name="done-all" size={19} color="#1677E8" />
              <ThemedText style={styles.markReadText}>Mark all read</ThemedText>
            </Pressable>
            <ThemedText style={styles.subtitle}>Stay up to date with your family. 💙</ThemedText>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}>
          {categories.map((category) => (
            <Pressable
              key={category}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedCategory === category }}
              onPress={() => setSelectedCategory(category)}
              style={[styles.filter, selectedCategory === category && styles.selectedFilter]}>
              <ThemedText
                style={[styles.filterText, selectedCategory === category && styles.selectedFilterText]}>
                {category}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {loading && <ThemedText style={styles.feedback}>Loading notifications...</ThemedText>}

        {!loading && error !== null && <ThemedText style={styles.feedbackError}>{error}</ThemedText>}

        {!loading && error === null && filteredActivities.length === 0 && (
          <ThemedText style={styles.feedback}>No notifications in this category yet.</ThemedText>
        )}

        {!loading && error === null && groupedActivities.map(
          ({ label, items }) =>
            items.length > 0 && (
              <View key={label} style={styles.group}>
                <ThemedText style={styles.groupTitle}>{label}</ThemedText>
                {items.map((item) => {
                  const details = getActivityDetails(item);
                  const canNavigate =
                    Boolean(item.relatedEntityId) &&
                    ['Event', 'Kickback', 'Poll', 'Announcement', 'Group'].includes(
                      item.relatedEntityType ?? '',
                    );
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole={canNavigate ? 'button' : undefined}
                      onPress={() => openActivity(item)}
                      style={[styles.card, styles[`${getCategory(item).toLowerCase()}Card` as 'allCard'] ?? styles.allCard]}>
                      <View style={[styles.iconCircle, styles[`${getCategory(item).toLowerCase()}Icon` as 'allIcon'] ?? styles.allIcon]}>
                        <MaterialIcons name={details.icon} size={23} color="#fff" />
                      </View>
                      <View style={styles.cardBody}>
                        <ThemedText style={styles.cardText}>
                          <ThemedText style={styles.actor}>{item.actorDisplayName || 'Someone'}</ThemedText>{' '}
                          {details.detail}
                        </ThemedText>
                        {details.title ? <ThemedText style={styles.entity}>{details.title}</ThemedText> : null}
                        {item.message && !details.title ? (
                          <ThemedText style={styles.secondary}>{getNotificationText(item)}</ThemedText>
                        ) : null}
                        <ThemedText style={styles.timestamp}>{getRelativeTime(item.createdAtUtc)}</ThemedText>
                      </View>
                      {canNavigate ? <MaterialIcons name="chevron-right" size={28} color="#172A4D" /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ),
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFE',
  },
  content: {
    padding: 24,
    paddingBottom: 32,
    gap: 18,
  },
  header: {
    alignItems: 'flex-start',
  },
  title: {
    color: '#10284A',
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    color: '#63728B',
    fontSize: 17,
    marginTop: 5,
  },
  markReadButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E5F1FF',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  markReadText: {
    color: '#1677E8',
    fontSize: 14,
    fontWeight: '600',
  },
  filters: {
    gap: 9,
    paddingVertical: 2,
  },
  filter: {
    backgroundColor: '#EAF0F8',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  selectedFilter: {
    backgroundColor: '#1687EE',
  },
  filterText: {
    color: '#193254',
    fontSize: 15,
    fontWeight: '600',
  },
  selectedFilterText: {
    color: '#fff',
  },
  group: {
    gap: 10,
  },
  groupTitle: {
    color: '#10284A',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 2,
  },
  card: {
    alignItems: 'center',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 12,
    minHeight: 94,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  allCard: { backgroundColor: '#EDF4FF' },
  eventsCard: { backgroundColor: '#EAF4FF' },
  kickbacksCard: { backgroundColor: '#FFF3E8' },
  groupsCard: { backgroundColor: '#EAF9F3' },
  pollsCard: { backgroundColor: '#F3EDFF' },
  announcementsCard: { backgroundColor: '#FFF0F5' },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 28,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  allIcon: { backgroundColor: '#1687EE' },
  eventsIcon: { backgroundColor: '#1687EE' },
  kickbacksIcon: { backgroundColor: '#F79524' },
  groupsIcon: { backgroundColor: '#13B77C' },
  pollsIcon: { backgroundColor: '#8A55E8' },
  announcementsIcon: { backgroundColor: '#E52A57' },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardText: {
    color: '#172A4D',
    fontSize: 16,
    lineHeight: 21,
  },
  actor: {
    fontWeight: '700',
  },
  entity: {
    color: '#172A4D',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  secondary: {
    color: '#63728B',
    fontSize: 14,
    lineHeight: 19,
  },
  timestamp: {
    color: '#63728B',
    fontSize: 13,
    marginTop: 4,
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
