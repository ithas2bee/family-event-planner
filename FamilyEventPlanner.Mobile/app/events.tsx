import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { getEventsByGroup, type Event } from '@/services/eventService';

type EventFilter = 'Upcoming' | 'Past' | 'My Events';

const FILTERS: EventFilter[] = ['Upcoming', 'Past', 'My Events'];
const IMAGE_TONES = [
  { background: '#D9F0F2', foreground: '#147D8A', icon: 'celebration' as const },
  { background: '#E9E1FF', foreground: '#7049C6', icon: 'music-note' as const },
  { background: '#DDF2E8', foreground: '#23835A', icon: 'school' as const },
  { background: '#FFE7D0', foreground: '#D87518', icon: 'cake' as const },
];

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function getEventStatus(startDate: string, now = new Date()): string {
  const eventDate = new Date(startDate);
  if (Number.isNaN(eventDate.getTime())) return 'Date pending';

  const dayDifference = Math.round((startOfDay(eventDate) - startOfDay(now)) / 86400000);
  if (dayDifference < 0) return 'Past';
  if (dayDifference === 0) return 'Next Up';
  if (dayDifference === 1) return 'Tomorrow';
  if (dayDifference < 30) return `In ${dayDifference} Days`;
  if (dayDifference < 60) return 'In 1 Month';
  return `In ${Math.round(dayDifference / 30)} Months`;
}

function formatEventDate(startDate: string): { date: string; time: string } {
  const parsedDate = new Date(startDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return { date: 'Date pending', time: 'Time pending' };
  }

  return {
    date: new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(parsedDate),
    time: new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(parsedDate),
  };
}

function isUpcoming(event: Event, now = new Date()): boolean {
  const eventDate = new Date(event.startDate);
  return !Number.isNaN(eventDate.getTime()) && startOfDay(eventDate) >= startOfDay(now);
}

function isMyEvent(event: Event, memberId: string): boolean {
  return (
    (memberId.length > 0 && event.createdByMemberId === memberId) ||
    Boolean(event.assignments?.some((assignment) => assignment.memberId === memberId))
  );
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

function EventCard({ event, index, onPress }: { event: Event; index: number; onPress: () => void }) {
  const tone = IMAGE_TONES[index % IMAGE_TONES.length];
  const date = formatEventDate(event.startDate);
  const assignments = event.assignments ?? [];
  const attendees = assignments.filter((assignment) => assignment.memberName.trim().length > 0);
  const status = getEventStatus(event.startDate);
  const isPast = status === 'Past';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.title || 'Untitled Event'}. ${date.date} at ${date.time}.`}
      android_ripple={{ color: '#E7EDF5' }}>
      <View style={[styles.eventImage, { backgroundColor: tone.background }]}>
        <View style={[styles.imageCircle, { backgroundColor: `${tone.foreground}22` }]} />
        <MaterialIcons name={tone.icon} size={34} color={tone.foreground} />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.titleRow}>
          <ThemedText type="defaultSemiBold" style={styles.eventTitle} numberOfLines={2}>
            {event.title || 'Untitled Event'}
          </ThemedText>
          <View style={[styles.statusBadge, isPast ? styles.pastBadge : styles.upcomingBadge]}>
            <ThemedText style={styles.statusText}>{status}</ThemedText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons name="event" size={15} color="#56708E" />
          <ThemedText style={styles.detailText} numberOfLines={1}>
            {date.date} · {date.time}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="place" size={15} color="#56708E" />
          <ThemedText style={styles.detailText} numberOfLines={1}>
            {event.location?.trim() || 'Location to be announced'}
          </ThemedText>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.attendees}>
            {attendees.slice(0, 3).map((attendee, attendeeIndex) => (
              <View
                key={`${attendee.memberName}-${attendeeIndex}`}
                style={[styles.avatar, { backgroundColor: IMAGE_TONES[attendeeIndex % IMAGE_TONES.length].background }]}>
                <ThemedText style={styles.avatarText}>{getInitials(attendee.memberName)}</ThemedText>
              </View>
            ))}
            {attendees.length > 3 ? (
              <View style={styles.moreAvatar}>
                <ThemedText style={styles.moreAvatarText}>+{attendees.length - 3}</ThemedText>
              </View>
            ) : null}
          </View>
          <View style={styles.arrowCircle}>
            <MaterialIcons name="chevron-right" size={21} color="#36516F" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function EventsScreen() {
  const { groupId, refreshToken } = useLocalSearchParams<{ groupId: string; refreshToken?: string }>();
  const { groupId: contextGroupId, memberId, setActiveGroup, isReady } = useActiveGroupContext();
  const groupIdValue = String(groupId ?? contextGroupId ?? '');
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<EventFilter>('Upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (groupId) void setActiveGroup({ groupId: String(groupId) });
  }, [groupId, setActiveGroup]);

  useEffect(() => {
    let cancelled = false;
    async function loadEvents() {
      setLoading(true);
      setError(null);
      if (!groupIdValue) {
        if (!isReady) return;
        setError('Group not found.');
        setLoading(false);
        return;
      }

      try {
        const data = await getEventsByGroup(groupIdValue);
        if (!cancelled) setEvents(data);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, [groupIdValue, refreshToken, isReady]);

  const filteredEvents = useMemo(() => {
    if (selectedFilter === 'Past') return events.filter((event) => !isUpcoming(event));
    if (selectedFilter === 'My Events') return events.filter((event) => isMyEvent(event, memberId));
    return events.filter((event) => isUpcoming(event));
  }, [events, memberId, selectedFilter]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <ThemedText type="title" style={styles.title}>Family Events</ThemedText>
            <ThemedText style={styles.subtitle}>Make time for what matters 📅</ThemedText>
          </View>
          <Pressable
            style={styles.createButton}
            onPress={() => router.push({ pathname: '/create-event', params: { groupId: groupIdValue } })}
            accessibilityRole="button"
            accessibilityLabel="Create Event">
            <MaterialIcons name="add" size={28} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.filterBar} accessibilityRole="tablist">
          {FILTERS.map((filter) => (
            <Pressable
              key={filter}
              style={[styles.filter, selectedFilter === filter && styles.selectedFilter]}
              onPress={() => setSelectedFilter(filter)}
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedFilter === filter }}>
              <ThemedText style={[styles.filterText, selectedFilter === filter && styles.selectedFilterText]}>
                {filter}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {loading ? <ThemedText style={styles.feedback}>Loading events...</ThemedText> : null}
        {!loading && error ? <ThemedText style={styles.feedbackError}>{error}</ThemedText> : null}
        {!loading && !error ? (
          <FlatList
            data={filteredEvents}
            keyExtractor={(item, index) => String(item.id || index)}
            renderItem={({ item, index }) => (
              <EventCard
                event={item}
                index={index}
                onPress={() => router.push({ pathname: '/event/[eventId]', params: { eventId: String(item.id) } })}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<ThemedText style={styles.feedback}>No {selectedFilter.toLowerCase()} events</ThemedText>}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F8FC' },
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 18 },
  heading: { flex: 1 },
  title: { color: '#111A30', fontSize: 27, lineHeight: 32, letterSpacing: -0.5 },
  subtitle: { color: '#45617F', fontSize: 14, marginTop: 3 },
  createButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#087AC5', elevation: 4, shadowColor: '#087AC5', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  filterBar: { flexDirection: 'row', backgroundColor: '#E8EEF6', borderRadius: 18, padding: 3, marginBottom: 16 },
  filter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 15 },
  selectedFilter: { backgroundColor: '#1689EE' },
  filterText: { color: '#4D6380', fontSize: 12, fontWeight: '600' },
  selectedFilterText: { color: '#FFFFFF' },
  list: { paddingBottom: 24, gap: 12 },
  card: { flexDirection: 'row', minHeight: 142, overflow: 'hidden', borderRadius: 18, backgroundColor: '#FFFFFF', shadowColor: '#203B5A', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cardPressed: { opacity: 0.9 },
  eventImage: { width: 94, margin: 8, borderRadius: 13, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imageCircle: { position: 'absolute', width: 120, height: 120, borderRadius: 60, right: -35, bottom: -28 },
  cardContent: { flex: 1, minWidth: 0, paddingTop: 14, paddingRight: 10, paddingBottom: 10, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  eventTitle: { flex: 1, color: '#16213A', fontSize: 15, lineHeight: 19 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4 },
  upcomingBadge: { backgroundColor: '#1689EE' },
  pastBadge: { backgroundColor: '#A7B3C2' },
  statusText: { color: '#FFFFFF', fontSize: 10, lineHeight: 12, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { flex: 1, color: '#536B88', fontSize: 12, lineHeight: 16 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' },
  attendees: { flexDirection: 'row', alignItems: 'center', minHeight: 27 },
  avatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF', marginRight: -5 },
  avatarText: { color: '#294B68', fontSize: 9, fontWeight: '700' },
  moreAvatar: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2F7', marginLeft: 7 },
  moreAvatarText: { color: '#4F6682', fontSize: 10, fontWeight: '700' },
  arrowCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EFF3F8', alignItems: 'center', justifyContent: 'center' },
  feedback: { color: '#536B88', textAlign: 'center', padding: 28 },
  feedbackError: { color: '#C0392B', textAlign: 'center', padding: 28 },
});
