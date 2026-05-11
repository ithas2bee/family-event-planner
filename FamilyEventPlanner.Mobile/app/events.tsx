import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getEventsByGroup, type Event } from '@/services/eventService';

export default function EventsScreen() {
  const { groupId, refreshToken } = useLocalSearchParams<{
    groupId: string;
    memberId: string;
    refreshToken?: string;
  }>();
  const groupIdValue = String(groupId ?? '');
  const refreshTokenValue = String(refreshToken ?? '');

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      if (groupIdValue.length === 0) {
        setError('Group not found.');
        setLoading(false);
        return;
      }

      try {
        const data = await getEventsByGroup(groupIdValue);
        if (!cancelled) {
          setEvents(data);
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

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [groupIdValue, refreshTokenValue]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Family Events
      </ThemedText>

      <Pressable
        style={styles.primaryButton}
        onPress={() =>
          router.push({
            pathname: '/create-event',
            params: { groupId: groupIdValue },
          })
        }>
        <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
          Create Event
        </ThemedText>
      </Pressable>

      {loading && <ThemedText style={styles.feedback}>Loading events...</ThemedText>}

      {!loading && error !== null && (
        <ThemedText style={styles.feedbackError}>{error}</ThemedText>
      )}

      {!loading && error === null && (
        <FlatList
          data={events}
          keyExtractor={(item, index) => String(item.id ?? index)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const title = item.title || 'Untitled Event';
            const startDate = item.startDate || '';
            const creatorName = item.creatorDisplayName || 'Unknown Member';

            return (
              <View style={styles.eventRow}>
                <ThemedText type="defaultSemiBold">{title}</ThemedText>
                <ThemedText>{startDate}</ThemedText>
                <ThemedText>{creatorName}</ThemedText>
              </View>
            );
          }}
          ListEmptyComponent={
            <ThemedText style={styles.feedback}>No events yet</ThemedText>
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
  eventRow: {
    paddingVertical: 12,
    gap: 2,
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
