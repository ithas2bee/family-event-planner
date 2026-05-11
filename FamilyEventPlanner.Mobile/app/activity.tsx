import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getActivityByGroup, type ActivityFeedItem } from '@/services/activityService';

type ActivityMetadata = {
  title?: string;
  question?: string;
  displayName?: string;
};

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

export default function ActivityScreen() {
  const { groupId, memberId } = useLocalSearchParams<{ groupId: string; memberId: string }>();
  const groupIdValue = String(groupId ?? '');
  const memberIdValue = String(memberId ?? '');

  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      if (groupIdValue.length === 0 || memberIdValue.length === 0) {
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
  }, [groupIdValue, memberIdValue]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Notifications
      </ThemedText>

      {loading && <ThemedText style={styles.feedback}>Loading notifications...</ThemedText>}

      {!loading && error !== null && <ThemedText style={styles.feedbackError}>{error}</ThemedText>}

      {!loading && error === null && (
        <FlatList
          data={activities}
          keyExtractor={(item, index) => String(item.id ?? index)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <View style={styles.activityRow}>
              <ThemedText>{getNotificationText(item)}</ThemedText>
              <ThemedText style={styles.timestamp}>{item.createdAtUtc || ''}</ThemedText>
            </View>
          )}
          ListEmptyComponent={<ThemedText style={styles.feedback}>No notifications yet</ThemedText>}
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
  activityRow: {
    paddingVertical: 12,
    gap: 2,
  },
  timestamp: {
    opacity: 0.7,
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
