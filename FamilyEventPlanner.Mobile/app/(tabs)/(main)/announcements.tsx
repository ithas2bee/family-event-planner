import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { getAnnouncementsByGroup, type Announcement } from '@/services/announcementService';

function toBodyPreview(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= 120) {
    return trimmed;
  }

  return `${trimmed.slice(0, 117)}...`;
}

export default function AnnouncementsScreen() {
  const { groupId, refreshToken } = useLocalSearchParams<{
    groupId: string;
    memberId: string;
    refreshToken?: string;
  }>();
  const { groupId: contextGroupId, setActiveGroup, isReady } = useActiveGroupContext();
  const groupIdValue = String(groupId ?? contextGroupId ?? '');
  const refreshTokenValue = String(refreshToken ?? '');

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
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

    async function loadAnnouncements() {
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
        const data = await getAnnouncementsByGroup(groupIdValue);
        if (!cancelled) {
          setAnnouncements(data);
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

    loadAnnouncements();

    return () => {
      cancelled = true;
    };
  }, [groupIdValue, refreshTokenValue, isReady]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Announcements
      </ThemedText>

      <Pressable
        style={styles.primaryButton}
        onPress={() =>
          router.push({
            pathname: '/create-announcement',
            params: { groupId: groupIdValue },
          })
        }>
        <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
          Create Announcement
        </ThemedText>
      </Pressable>

      {loading && <ThemedText style={styles.feedback}>Loading announcements...</ThemedText>}

      {!loading && error !== null && <ThemedText style={styles.feedbackError}>{error}</ThemedText>}

      {!loading && error === null && (
        <FlatList
          data={announcements}
          keyExtractor={(item, index) => String(item.id ?? index)}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const title = item.title || 'Untitled Announcement';
            const bodyPreview = toBodyPreview(item.body || '');
            const creatorName = item.creatorDisplayName || 'Unknown Member';
            const createdAt = item.createdAt || '';

            return (
              <View style={styles.announcementRow}>
                <ThemedText type="defaultSemiBold">{title}</ThemedText>
                <ThemedText>{bodyPreview}</ThemedText>
                <ThemedText>{creatorName}</ThemedText>
                <ThemedText>{createdAt}</ThemedText>
              </View>
            );
          }}
          ListEmptyComponent={<ThemedText style={styles.feedback}>No announcements yet</ThemedText>}
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
  announcementRow: {
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
