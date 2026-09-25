import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { getPollsByGroup, type Poll } from '@/services/pollService';

type PollFilter = 'All' | 'Active' | 'Closed' | 'My Polls';

function formatPollDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isPollClosed(poll: Poll): boolean {
  return Boolean(poll.isClosed || poll.status?.toLowerCase() === 'closed');
}

export default function PollsScreen() {
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
  const refreshTokenValue = String(refreshToken ?? '');

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PollFilter>('All');

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

    async function refreshPolls() {
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
        const data = await getPollsByGroup(groupIdValue);
        if (!cancelled) {
          setPolls(data);
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

    refreshPolls();

    return () => {
      cancelled = true;
    };
  }, [groupIdValue, memberIdValue, refreshTokenValue, isReady, isResolvingMember]);

  const visiblePolls = polls.filter((poll) => {
    if (filter === 'Active') return !isPollClosed(poll);
    if (filter === 'Closed') return isPollClosed(poll);
    if (filter === 'My Polls') return poll.createdByMemberId === memberIdValue;
    return true;
  });

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={visiblePolls}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <ThemedText type="title" style={styles.title}>Polls</ThemedText>
                <ThemedText style={styles.subtitle}>Help your family make decisions together.</ThemedText>
              </View>
              <View style={styles.headerIcon}>
                <MaterialIcons name="poll" size={28} color="#087CF2" />
              </View>
            </View>

            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push({ pathname: '/create-poll', params: { groupId: groupIdValue, memberId: memberIdValue } })}>
              <MaterialIcons name="add-circle-outline" size={23} color="#fff" />
              <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>Create Poll</ThemedText>
            </Pressable>

            <View style={styles.filters}>
              {(['All', 'Active', 'Closed', 'My Polls'] as PollFilter[]).map((option) => (
                <Pressable key={option} onPress={() => setFilter(option)} style={[styles.filter, filter === option && styles.filterSelected]}>
                  <ThemedText style={[styles.filterText, filter === option && styles.filterTextSelected]}>{option}</ThemedText>
                </Pressable>
              ))}
            </View>
            {loading && <ThemedText style={styles.feedback}>Loading polls...</ThemedText>}
            {!loading && error !== null && <ThemedText style={styles.feedbackError}>{error}</ThemedText>}
          </>
        }
        renderItem={({ item }) => {
          const closed = isPollClosed(item);
          const voteCount = item.options.reduce((total, option) => total + option.voteCount, 0);
          return (
            <Pressable
              style={({ pressed }) => [styles.pollCard, pressed && styles.cardPressed]}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/(main)/poll/[pollId]',
                  params: { pollId: item.id },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Open poll: ${item.question || 'Untitled Poll'}`}>
              <View style={styles.pollIcon}><MaterialIcons name="poll" size={25} color="#087CF2" /></View>
              <View style={styles.pollBody}>
                <View style={styles.cardTopRow}>
                  <ThemedText type="defaultSemiBold" style={styles.question} numberOfLines={2}>{item.question || 'Untitled Poll'}</ThemedText>
                  <View style={[styles.status, closed ? styles.closedStatus : styles.activeStatus]}>
                    <ThemedText style={[styles.statusText, closed ? styles.closedText : styles.activeText]}>{closed ? 'Closed' : 'Active'}</ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.preview} numberOfLines={1}>{item.question || 'Family decision poll'}</ThemedText>
                <ThemedText style={styles.metadata}>{item.options.length} options  •  {voteCount} votes  •  by {item.creatorDisplayName || 'Unknown Member'}</ThemedText>
                <View style={styles.dateRow}>
                  <ThemedText style={styles.date}>{formatPollDate(item.createdAt)}</ThemedText>
                  <MaterialIcons name="arrow-forward-ios" size={17} color="#1768A8" />
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={!loading && error === null ? <ThemedText style={styles.feedback}>No polls match this filter.</ThemedText> : null}
      />

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F9FF',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: '#10255B',
    marginBottom: 5,
  },
  subtitle: {
    color: '#617DAA',
    fontSize: 16,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E1F0FF',
  },
  feedback: {
    textAlign: 'center',
    marginTop: 20,
    color: '#617DAA',
  },
  feedbackError: {
    textAlign: 'center',
    marginTop: 20,
    color: '#cc0000',
  },
  primaryButton: {
    backgroundColor: '#087CF2',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  primaryButtonText: {
    color: '#fff',
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  filter: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#EAF1FA',
    paddingVertical: 10,
  },
  filterSelected: {
    backgroundColor: '#D9EBFF',
  },
  filterText: {
    color: '#617DAA',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextSelected: {
    color: '#087CF2',
  },
  pollCard: {
    flexDirection: 'row',
    gap: 13,
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#17477D',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.82,
  },
  pollIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5F2FF',
  },
  pollBody: {
    flex: 1,
    gap: 5,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  question: {
    flex: 1,
    color: '#10255B',
    fontSize: 17,
    lineHeight: 22,
  },
  preview: {
    color: '#6682AE',
    fontSize: 14,
  },
  metadata: {
    color: '#6682AE',
    fontSize: 13,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  date: {
    color: '#6682AE',
    fontSize: 13,
  },
  status: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  activeStatus: {
    backgroundColor: '#DDF8EA',
  },
  closedStatus: {
    backgroundColor: '#EEE7FF',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeText: {
    color: '#159157',
  },
  closedText: {
    color: '#7654C4',
  },
});
