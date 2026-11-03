import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getPollById, type Poll, voteOnPoll } from '@/services/pollService';

function formatPollDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isPollClosed(poll: Poll): boolean {
  return Boolean(poll.isClosed || poll.status?.toLowerCase() === 'closed');
}

export default function PollDetailsScreen() {
  const { pollId } = useLocalSearchParams<{ pollId: string }>();
  const insets = useSafeAreaInsets();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pollId) {
      setError('Poll not found.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    void getPollById(String(pollId))
      .then((data) => {
        if (!cancelled) setPoll(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load this poll.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pollId]);

  async function handleVote(optionId: string) {
    if (!poll || voting || poll.currentMemberSelectedOptionId || isPollClosed(poll)) return;
    try {
      setVoting(true);
      await voteOnPoll(optionId);
      setPoll(await getPollById(poll.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to submit your vote.');
    } finally {
      setVoting(false);
    }
  }

  if (loading) {
    return <ThemedView style={styles.centered}><ActivityIndicator color="#087CF2" /><ThemedText style={styles.feedback}>Loading poll...</ThemedText></ThemedView>;
  }

  if (!poll || error) {
    return (
      <ThemedView style={[styles.centered, { paddingTop: insets.top + 24 }]}>
        <ThemedText style={styles.feedback}>{error || 'Poll not found.'}</ThemedText>
      </ThemedView>
    );
  }

  const closed = isPollClosed(poll);
  const totalVotes = poll.options.reduce((total, option) => total + option.voteCount, 0);
  const hasVoted = Boolean(poll.currentMemberSelectedOptionId);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
        <View style={styles.navRow}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.navigationButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#102653" />
          </Pressable>
          <ThemedText type="subtitle" style={styles.navTitle}>Poll Details</ThemedText>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.pollIcon}><MaterialIcons name="poll" size={28} color="#087CF2" /></View>
            <View style={[styles.status, closed ? styles.closedStatus : styles.activeStatus]}>
              <ThemedText style={[styles.statusText, closed ? styles.closedText : styles.activeText]}>{closed ? 'Closed' : 'Active'}</ThemedText>
            </View>
          </View>
          <ThemedText type="subtitle" style={styles.question}>{poll.question || 'Untitled Poll'}</ThemedText>
          <View style={styles.divider} />
          <View style={styles.creatorRow}>
            <View style={styles.avatar}><ThemedText style={styles.avatarText}>{(poll.creatorDisplayName || '?').slice(0, 1).toUpperCase()}</ThemedText></View>
            <View style={styles.creatorInfo}><ThemedText style={styles.label}>Created by</ThemedText><ThemedText style={styles.value}>{poll.creatorDisplayName || 'Unknown Member'}</ThemedText></View>
            <MaterialIcons name="calendar-today" size={22} color="#1768A8" />
            <View style={styles.creatorInfo}><ThemedText style={styles.label}>Created</ThemedText><ThemedText style={styles.value}>{formatPollDate(poll.createdAt)}</ThemedText></View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Options</ThemedText>
          <ThemedText style={styles.voteTotal}>({totalVotes} votes)</ThemedText>
        </View>
        {poll.options.length === 0 ? <ThemedText style={styles.emptyOptions}>No options are available for this poll.</ThemedText> : null}
        {poll.options.map((option) => {
          const selected = option.id === poll.currentMemberSelectedOptionId;
          const percentage = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
          return (
            <Pressable
              key={option.id}
              style={[styles.optionCard, selected && styles.selectedOption]}
              onPress={() => handleVote(option.id)}
              disabled={closed || hasVoted || voting}
              accessibilityRole="button"
              accessibilityLabel={`${option.text}, ${option.voteCount} votes${selected ? ', your vote' : ''}`}>
              <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
              <View style={styles.optionBody}>
                <View style={styles.optionTop}><ThemedText type="defaultSemiBold" style={styles.optionText}>{option.text}</ThemedText><ThemedText style={styles.optionCount}>{option.voteCount} ({percentage}%)</ThemedText></View>
                <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percentage}%` }]} /></View>
              </View>
              {selected ? <ThemedText style={styles.yourVote}>Your Vote</ThemedText> : null}
            </Pressable>
          );
        })}
        {voting ? <ThemedText style={styles.feedback}>Submitting vote...</ThemedText> : null}
        {closed ? <ThemedText style={styles.closedMessage}>This poll is closed. Voting is no longer available.</ThemedText> : null}
        {!closed && hasVoted ? <ThemedText style={styles.votedMessage}>Your vote has been recorded.</ThemedText> : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  content: { padding: 20, paddingBottom: 36, gap: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, backgroundColor: '#F5F9FF' },
  feedback: { color: '#617DAA', textAlign: 'center' },
  navRow: { alignItems: 'center', marginBottom: 2 },
  navigationButton: { position: 'absolute', left: 0, padding: 4 },
  navTitle: { color: '#10255B', fontSize: 22 },
  heroCard: { gap: 16, borderRadius: 20, padding: 18, backgroundColor: '#FFFFFF', shadowColor: '#17477D', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pollIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5F2FF' },
  question: { color: '#10255B', fontSize: 24, lineHeight: 30 },
  divider: { height: 1, backgroundColor: '#E7EEF7' },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDEEFF' },
  avatarText: { color: '#087CF2', fontSize: 18, fontWeight: '700' },
  creatorInfo: { flex: 1, gap: 2 },
  label: { color: '#7890B3', fontSize: 12 },
  value: { color: '#315B92', fontSize: 14, fontWeight: '600' },
  status: { borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 },
  activeStatus: { backgroundColor: '#DDF8EA' },
  closedStatus: { backgroundColor: '#EEE7FF' },
  statusText: { fontSize: 13, fontWeight: '700' },
  activeText: { color: '#159157' },
  closedText: { color: '#7654C4' },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 8 },
  sectionTitle: { color: '#10255B', fontSize: 20 },
  voteTotal: { color: '#6682AE', fontSize: 15 },
  emptyOptions: { color: '#6682AE', paddingVertical: 18 },
  optionCard: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 15, padding: 14, backgroundColor: '#FFFFFF', shadowColor: '#17477D', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  selectedOption: { borderWidth: 1, borderColor: '#69B0FF' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#B5CBE4', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#087CF2' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#087CF2' },
  optionBody: { flex: 1, gap: 9 },
  optionTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  optionText: { flex: 1, color: '#10255B' },
  optionCount: { color: '#6682AE', fontSize: 13 },
  progressTrack: { height: 8, overflow: 'hidden', borderRadius: 4, backgroundColor: '#DCE8F5' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#087CF2' },
  yourVote: { color: '#087CF2', fontSize: 12, fontWeight: '700' },
  closedMessage: { color: '#7654C4', textAlign: 'center', marginTop: 4 },
  votedMessage: { color: '#159157', textAlign: 'center', marginTop: 4 },
});
