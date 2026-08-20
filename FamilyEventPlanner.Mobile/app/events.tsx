import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { getEventsByGroup, type Event } from '@/services/eventService';

export default function EventsScreen() {
  const { groupId, refreshToken } = useLocalSearchParams<{
    groupId: string;
    memberId: string;
    refreshToken?: string;
  }>();
  const { groupId: contextGroupId, setActiveGroup, isReady } = useActiveGroupContext();
  const groupIdValue = String(groupId ?? contextGroupId ?? '');
  const refreshTokenValue = String(refreshToken ?? '');

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) {
      return;
    }

    void setActiveGroup({ groupId: String(groupId) });
  }, [groupId, setActiveGroup]);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setError(null);

      if (groupIdValue.length === 0) {
        if (!isReady) {
          return;
        }

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
  }, [groupIdValue, refreshTokenValue, isReady]);

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
          renderItem={({ item }) => {
            const title = item.title || 'Untitled Event';
            const startDate = item.startDate || '';
            const creatorName = item.creatorDisplayName || 'Unknown Member';

            // format ISO datetime to local friendly string: "May 10, 2026 • 6:00 PM"
            function formatEventDate(iso?: string) {
              if (!iso) return '';
              const d = new Date(iso);
              if (isNaN(d.getTime())) return iso;
              const datePart = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
              const timePart = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d);
              return `${datePart} • ${timePart}`;
            }

            return (
              <Pressable
                style={styles.eventCard}
                onPress={() => router.push({ pathname: '/event/[eventId]', params: { eventId: String(item.id) } })}
                android_ripple={{ color: '#e0e0e0' }}
              >
                <ThemedText type="defaultSemiBold">{title}</ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <IconSymbol name="calendar" size={16} color="#8f99a6" />
                  <ThemedText style={{ marginLeft: 8, fontSize: 14 }}>{formatEventDate(startDate)}</ThemedText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <IconSymbol name="person.fill" size={14} color="#9aa3ab" />
                  <ThemedText style={{ marginLeft: 8, color: '#8f99a6' }}>Hosted by {creatorName}</ThemedText>
                </View>
              </Pressable>
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
    padding: 24,
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
  eventCard: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.02)',
    marginBottom: 16,
    // very subtle shadow / elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 1,
    elevation: 1,
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
