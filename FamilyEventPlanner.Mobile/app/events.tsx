import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getGroupEvents, type FamilyEvent } from '@/services/eventService';

export default function EventsScreen() {
  const { groupId, memberId } = useLocalSearchParams<{ groupId: string; memberId: string }>();
  const groupIdValue = String(groupId ?? '');
  const memberIdValue = String(memberId ?? '');

  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await getGroupEvents(groupIdValue, memberIdValue);
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [groupIdValue, memberIdValue]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Family Events
      </ThemedText>

      <ThemedText style={styles.ids}>Group ID: {groupIdValue}</ThemedText>
      <ThemedText style={styles.ids}>Member ID: {memberIdValue}</ThemedText>

      {loading && <ThemedText style={styles.feedback}>Loading events...</ThemedText>}

      {!loading && error !== null && (
        <ThemedText style={styles.feedbackError}>{error}</ThemedText>
      )}

      {!loading && error === null && (
        <FlatList
          data={events}
          keyExtractor={(item, index) => String(item.id ?? item.eventId ?? index)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const title = item.title ?? item.eventTitle ?? item.name ?? 'Untitled Event';
            const startDate = item.startDate ?? item.startsAt ?? item.eventDate ?? '';

            return (
              <View style={styles.eventRow}>
                <ThemedText type="defaultSemiBold">{title}</ThemedText>
                <ThemedText>{startDate}</ThemedText>
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
  ids: {
    textAlign: 'center',
    opacity: 0.7,
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
