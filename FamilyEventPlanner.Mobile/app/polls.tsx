import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getPollsByGroup, type Poll, voteOnPoll } from '@/services/pollService';

export default function PollsScreen() {
  const { groupId, memberId, refreshToken } = useLocalSearchParams<{
    groupId: string;
    memberId: string;
    refreshToken?: string;
  }>();
  const groupIdValue = String(groupId ?? '');
  const memberIdValue = String(memberId ?? '');
  const refreshTokenValue = String(refreshToken ?? '');

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refreshPolls() {
      if (groupIdValue.length === 0 || memberIdValue.length === 0) {
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
  }, [groupIdValue, memberIdValue, refreshTokenValue]);

  async function handleVote(pollId: string, pollOptionId: string, hasVoted: boolean) {
    if (hasVoted || votingPollId !== null) {
      return;
    }

    try {
      setVotingPollId(pollId);
      setError(null);
      await voteOnPoll(pollOptionId);

      const updatedPolls = await getPollsByGroup(groupIdValue);
      setPolls(updatedPolls);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setVotingPollId(null);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Polls
      </ThemedText>

      <Pressable
        style={styles.primaryButton}
        onPress={() =>
          router.push({
            pathname: '/create-poll',
            params: { groupId: groupIdValue, memberId: memberIdValue },
          })
        }>
        <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
          Create Poll
        </ThemedText>
      </Pressable>

      {loading && <ThemedText style={styles.feedback}>Loading polls...</ThemedText>}

      {!loading && error !== null && <ThemedText style={styles.feedbackError}>{error}</ThemedText>}

      {!loading && error === null && (
        <FlatList
          data={polls}
          keyExtractor={(item, index) => String(item.id ?? index)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const question = item.question || 'Untitled Poll';
            const creatorName = item.creatorDisplayName || 'Unknown Member';
            const createdAt = item.createdAt || '';

            return (
              <View style={styles.pollRow}>
                <ThemedText type="defaultSemiBold">{question}</ThemedText>
                <ThemedText>{creatorName}</ThemedText>
                <ThemedText>{createdAt}</ThemedText>

                {item.options.map((option) => {
                  const isSelected = option.id === item.currentMemberSelectedOptionId;
                  const hasVoted = Boolean(item.currentMemberSelectedOptionId);
                  const canVote = !hasVoted && votingPollId === null;

                  return (
                    <Pressable
                      key={option.id}
                      style={styles.optionRow}
                      onPress={() => handleVote(item.id, option.id, hasVoted)}
                      disabled={!canVote}>
                      <ThemedText>
                        {option.text} ({option.voteCount}) {isSelected ? '(Your Vote)' : ''}
                      </ThemedText>
                    </Pressable>
                  );
                })}

                {votingPollId === item.id && <ThemedText>Submitting vote...</ThemedText>}
              </View>
            );
          }}
          ListEmptyComponent={<ThemedText style={styles.feedback}>No polls yet</ThemedText>}
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
    marginBottom: 8,
  },
  feedback: {
    textAlign: 'center',
    marginTop: 20,
  },
  feedbackError: {
    textAlign: 'center',
    marginTop: 20,
    color: '#cc0000',
  },
  separator: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
  },
  pollRow: {
    gap: 4,
  },
  optionRow: {
    paddingLeft: 8,
  },
});
