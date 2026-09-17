import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import {
  getKickbacksByGroup,
  respondToKickback,
  type Kickback,
  type KickbackResponseType,
} from '@/services/kickbackService';

type KickbackFilter = 'Active' | 'Past' | 'My Kickbacks';

const FILTERS: KickbackFilter[] = ['Active', 'Past', 'My Kickbacks'];
const VIBE_TONES = [
  { background: '#FFE3C1', foreground: '#C56A1A', icon: 'local-fire-department' as const },
  { background: '#D8EFF1', foreground: '#187D8A', icon: 'pool' as const },
  { background: '#E8E0FF', foreground: '#714DC4', icon: 'sports-esports' as const },
  { background: '#DDEFD9', foreground: '#478C45', icon: 'music-note' as const },
];
const STATUS_COLORS = ['#57C987', '#8942E9', '#42BBD8'];

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function getKickbackStatus(expiresAtUtc: string, now = new Date()): string {
  const expiry = new Date(expiresAtUtc);
  if (Number.isNaN(expiry.getTime())) return 'Time pending';
  if (expiry.getTime() < now.getTime()) return 'Past';

  const dayDifference = Math.round((startOfDay(expiry) - startOfDay(now)) / 86400000);
  if (dayDifference === 0) return 'Happening Now';
  if (dayDifference === 1) return 'Tomorrow';
  return `In ${dayDifference} Days`;
}

function formatKickbackDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time pending';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
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

function isMyKickback(kickback: Kickback, memberId: string): boolean {
  return memberId.length > 0 && kickback.createdByMemberId === memberId;
}

function KickbackCard({
  kickback,
  index,
  responseLoadingKickbackId,
  onResponse,
}: {
  kickback: Kickback;
  index: number;
  responseLoadingKickbackId: string | null;
  onResponse: (responseType: KickbackResponseType) => void;
}) {
  const tone = VIBE_TONES[index % VIBE_TONES.length];
  const status = getKickbackStatus(kickback.expiresAtUtc);
  const isPast = status === 'Past';
  const response = kickback.currentMemberResponse;
  const isBusy = responseLoadingKickbackId === kickback.id;
  const participantCount = kickback.pullingUpCount + kickback.maybeCount;

  return (
    <View style={styles.card}>
      <View style={[styles.cardImage, { backgroundColor: tone.background }]}>
        <View style={[styles.imageGlow, { backgroundColor: `${tone.foreground}22` }]} />
        <MaterialIcons name={tone.icon} size={34} color={tone.foreground} />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.titleRow}>
          <ThemedText type="defaultSemiBold" style={styles.cardTitle} numberOfLines={2}>
            {kickback.vibe || 'Kickback'}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: isPast ? '#A7B3C2' : STATUS_COLORS[index % STATUS_COLORS.length] }]}>
            <ThemedText style={styles.statusText}>{status}</ThemedText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons name="schedule" size={15} color="#56708E" />
          <ThemedText style={styles.detailText} numberOfLines={1}>
            {formatKickbackDate(kickback.createdAtUtc)}
          </ThemedText>
        </View>
        {kickback.note ? (
          <View style={styles.detailRow}>
            <MaterialIcons name="place" size={15} color="#56708E" />
            <ThemedText style={styles.detailText} numberOfLines={1}>
              {kickback.note}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.bottomRow}>
          <View style={styles.participants}>
            {kickback.creatorDisplayName ? (
              <View style={[styles.avatar, { backgroundColor: tone.background }]}>
                <ThemedText style={styles.avatarText}>{getInitials(kickback.creatorDisplayName)}</ThemedText>
              </View>
            ) : null}
            <View style={styles.moreAvatar}>
              <ThemedText style={styles.moreAvatarText}>+{participantCount}</ThemedText>
            </View>
          </View>
          <View style={styles.arrowCircle}>
            <MaterialIcons name="chevron-right" size={21} color="#36516F" />
          </View>
        </View>

        {!isPast ? (
          <View style={styles.responseGroup}>
            {(['PullingUp', 'Maybe'] as KickbackResponseType[]).map((responseType) => (
              <Pressable
                key={responseType}
                style={[styles.responseButton, response === responseType && styles.responseButtonSelected]}
                onPress={() => onResponse(responseType)}
                disabled={isBusy}
                accessibilityRole="button">
                <ThemedText
                  style={[styles.responseButtonText, response === responseType && styles.responseButtonTextSelected]}>
                  {responseType === 'PullingUp' ? 'Pulling up' : 'Maybe'}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function KickbacksScreen() {
  const { groupId, memberId, refreshToken } = useLocalSearchParams<{
    groupId: string;
    memberId: string;
    refreshToken?: string;
  }>();
  const {
    groupId: contextGroupId,
    memberId: contextMemberId,
    setActiveGroup,
    isReady,
    isResolvingMember,
  } = useActiveGroupContext();
  const groupIdValue = String(groupId ?? contextGroupId ?? '');
  const memberIdValue = String(memberId ?? contextMemberId ?? '');
  const [kickbacks, setKickbacks] = useState<Kickback[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<KickbackFilter>('Active');
  const [loading, setLoading] = useState(true);
  const [responseLoadingKickbackId, setResponseLoadingKickbackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const update: { groupId?: string; memberId?: string } = {};
    if (groupId) update.groupId = String(groupId);
    if (memberId) update.memberId = String(memberId);
    if (Object.keys(update).length > 0) void setActiveGroup(update);
  }, [groupId, memberId, setActiveGroup]);

  useEffect(() => {
    let cancelled = false;
    async function loadKickbacks() {
      setLoading(true);
      setError(null);
      if (!groupIdValue || !memberIdValue) {
        if (!isReady || isResolvingMember) return;
        setError('Group not found.');
        setLoading(false);
        return;
      }
      try {
        const data = await getKickbacksByGroup(groupIdValue);
        if (!cancelled) setKickbacks(data);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadKickbacks();
    return () => {
      cancelled = true;
    };
  }, [groupIdValue, memberIdValue, refreshToken, isReady, isResolvingMember]);

  const filteredKickbacks = useMemo(() => {
    if (selectedFilter === 'My Kickbacks') return kickbacks.filter((kickback) => isMyKickback(kickback, memberIdValue));
    if (selectedFilter === 'Past') return kickbacks.filter((kickback) => !kickback.isActive);
    return kickbacks.filter((kickback) => kickback.isActive);
  }, [kickbacks, memberIdValue, selectedFilter]);

  async function handleResponse(kickbackId: string, responseType: KickbackResponseType) {
    if (responseLoadingKickbackId !== null) return;
    try {
      setResponseLoadingKickbackId(kickbackId);
      await respondToKickback({ kickbackId, responseType });
      setKickbacks(await getKickbacksByGroup(groupIdValue));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setResponseLoadingKickbackId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <ThemedText type="title" style={styles.title}>Kickbacks</ThemedText>
            <ThemedText style={styles.subtitle}>Spontaneous moments. Stronger bonds. ✨</ThemedText>
          </View>
          <Pressable
            style={styles.createButton}
            onPress={() => router.push({ pathname: '/create-kickback', params: { groupId: groupIdValue, memberId: memberIdValue } })}
            accessibilityRole="button"
            accessibilityLabel="Create Kickback">
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

        {loading ? <ThemedText style={styles.feedback}>Loading kickbacks...</ThemedText> : null}
        {!loading && error ? <ThemedText style={styles.feedbackError}>{error}</ThemedText> : null}
        {!loading && !error ? (
          <FlatList
            data={filteredKickbacks}
            keyExtractor={(item, index) => String(item.id || index)}
            renderItem={({ item, index }) => (
              <KickbackCard
                kickback={item}
                index={index}
                responseLoadingKickbackId={responseLoadingKickbackId}
                onResponse={(responseType) => void handleResponse(item.id, responseType)}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <ThemedText style={styles.feedback}>
                No {selectedFilter.toLowerCase()} kickbacks yet
              </ThemedText>
            }
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
  card: { flexDirection: 'row', minHeight: 158, overflow: 'hidden', borderRadius: 18, backgroundColor: '#FFFFFF', shadowColor: '#203B5A', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  cardImage: { width: 94, height: 126, margin: 8, borderRadius: 13, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imageGlow: { position: 'absolute', width: 120, height: 120, borderRadius: 60, right: -35, bottom: -28 },
  cardContent: { flex: 1, minWidth: 0, paddingTop: 14, paddingRight: 10, paddingBottom: 10, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  cardTitle: { flex: 1, color: '#16213A', fontSize: 15, lineHeight: 19 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4 },
  statusText: { color: '#FFFFFF', fontSize: 10, lineHeight: 12, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { flex: 1, color: '#536B88', fontSize: 12, lineHeight: 16 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' },
  participants: { flexDirection: 'row', alignItems: 'center', minHeight: 27 },
  avatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  avatarText: { color: '#294B68', fontSize: 9, fontWeight: '700' },
  moreAvatar: { width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2F7', marginLeft: 5 },
  moreAvatarText: { color: '#4F6682', fontSize: 10, fontWeight: '700' },
  arrowCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EFF3F8', alignItems: 'center', justifyContent: 'center' },
  responseGroup: { flexDirection: 'row', gap: 6 },
  responseButton: { flex: 1, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#D7E2EF', paddingVertical: 5 },
  responseButtonSelected: { backgroundColor: '#1689EE', borderColor: '#1689EE' },
  responseButtonText: { color: '#45617F', fontSize: 11, fontWeight: '600' },
  responseButtonTextSelected: { color: '#FFFFFF' },
  feedback: { color: '#536B88', textAlign: 'center', padding: 28 },
  feedbackError: { color: '#C0392B', textAlign: 'center', padding: 28 },
});
