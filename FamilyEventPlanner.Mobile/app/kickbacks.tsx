import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    getKickbacksByGroup,
    respondToKickback,
    type Kickback,
    type KickbackResponseType,
} from '@/services/kickbackService';

function formatDateTime(value: string): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function KickbacksScreen() {
  const { groupId, memberId, refreshToken } = useLocalSearchParams<{
    groupId: string;
    memberId: string;
    refreshToken?: string;
  }>();
  const groupIdValue = String(groupId ?? '');
  const memberIdValue = String(memberId ?? '');
  const refreshTokenValue = String(refreshToken ?? '');

  const [kickbacks, setKickbacks] = useState<Kickback[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseLoadingKickbackId, setResponseLoadingKickbackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadKickbacks() {
      if (groupIdValue.length === 0 || memberIdValue.length === 0) {
        setError('Group not found.');
        setLoading(false);
        return;
      }

      try {
        const data = await getKickbacksByGroup(groupIdValue);
        if (!cancelled) {
          setKickbacks(data);
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

    loadKickbacks();

    return () => {
      cancelled = true;
    };
  }, [groupIdValue, memberIdValue, refreshTokenValue]);

  async function handleResponse(kickbackId: string, responseType: KickbackResponseType) {
    if (responseLoadingKickbackId !== null) {
      return;
    }

    try {
      setResponseLoadingKickbackId(kickbackId);
      setError(null);
      await respondToKickback({ kickbackId, responseType });

      const updatedKickbacks = await getKickbacksByGroup(groupIdValue);
      setKickbacks(updatedKickbacks);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setResponseLoadingKickbackId(null);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Kickbacks
      </ThemedText>

      <Pressable
        style={styles.primaryButton}
        onPress={() =>
          router.push({
            pathname: '/create-kickback',
            params: { groupId: groupIdValue, memberId: memberIdValue },
          })
        }>
        <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
          Create Kickback
        </ThemedText>
      </Pressable>

      {loading && <ThemedText style={styles.feedback}>Loading kickbacks...</ThemedText>}

      {!loading && error !== null && <ThemedText style={styles.feedbackError}>{error}</ThemedText>}

      {!loading && error === null && (
        <FlatList
          data={kickbacks}
          keyExtractor={(item, index) => String(item.id ?? index)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const isBusy = responseLoadingKickbackId === item.id;
            const currentResponse = item.currentMemberResponse;
            const expiresAt = formatDateTime(item.expiresAtUtc);
            const createdBy = item.creatorDisplayName || 'Unknown Member';

            return (
              <View style={styles.kickbackRow}>
                <ThemedText type="defaultSemiBold">{item.vibe || 'Kickback'}</ThemedText>
                {item.note ? <ThemedText>{item.note}</ThemedText> : null}
                <ThemedText>{createdBy}</ThemedText>
                <ThemedText>Expires: {expiresAt}</ThemedText>
                <ThemedText>
                  Pulling Up: {item.pullingUpCount} | Maybe: {item.maybeCount}
                </ThemedText>
                <ThemedText>
                  Your response: {currentResponse ? currentResponse : 'None yet'}
                </ThemedText>

                <View style={styles.responseGroup}>
                  <Pressable
                    style={[
                      styles.responseButton,
                      currentResponse === 'PullingUp' && styles.responseButtonSelected,
                      isBusy && styles.responseButtonDisabled,
                    ]}
                    onPress={() => handleResponse(item.id, 'PullingUp')}
                    disabled={isBusy}>
                    <ThemedText
                      type="defaultSemiBold"
                      style={[
                        styles.responseButtonText,
                        currentResponse === 'PullingUp' && styles.responseButtonTextSelected,
                      ]}>
                      Pulling Up{currentResponse === 'PullingUp' ? ' ✓' : ''}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.responseButton,
                      currentResponse === 'Maybe' && styles.responseButtonSelected,
                      isBusy && styles.responseButtonDisabled,
                    ]}
                    onPress={() => handleResponse(item.id, 'Maybe')}
                    disabled={isBusy}>
                    <ThemedText
                      type="defaultSemiBold"
                      style={[
                        styles.responseButtonText,
                        currentResponse === 'Maybe' && styles.responseButtonTextSelected,
                      ]}>
                      Maybe{currentResponse === 'Maybe' ? ' ✓' : ''}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<ThemedText style={styles.feedback}>No kickbacks yet</ThemedText>}
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
  kickbackRow: {
    gap: 4,
  },
  responseGroup: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  responseButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0A7EA4',
    flex: 1,
    alignItems: 'center',
  },
  responseButtonSelected: {
    backgroundColor: '#0A7EA4',
  },
  responseButtonDisabled: {
    opacity: 0.6,
  },
  responseButtonText: {
    color: '#0A7EA4',
  },
  responseButtonTextSelected: {
    color: '#FFFFFF',
  },
});
