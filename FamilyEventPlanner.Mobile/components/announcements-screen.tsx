import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import {
  formatAnnouncementDate,
  getAnnouncementsByGroup,
  type Announcement,
} from '@/services/announcementService';

function toBodyPreview(body: string): string {
  const trimmed = body.trim();
  return trimmed.length <= 120 ? trimmed : `${trimmed.slice(0, 117)}...`;
}

function AnnouncementListCard({
  item,
  onPress,
}: {
  item: Announcement;
  onPress: () => void;
}) {
  const title = item.title || 'Untitled announcement';
  const author = item.creatorDisplayName || 'Unknown member';
  const body = toBodyPreview(item.body || '');

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}. Posted by ${author}. Open announcement.`}>
      <View style={styles.cardIcon}>
        <MaterialIcons name="campaign" size={25} color="#1476E8" />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <ThemedText type="defaultSemiBold" style={styles.cardTitle} numberOfLines={2}>
            {title}
          </ThemedText>
          <View style={styles.typePill}>
            <ThemedText style={styles.typeText}>Announcement</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.cardBody} numberOfLines={2}>
          {body || 'No message provided.'}
        </ThemedText>
        <ThemedText style={styles.cardMeta} numberOfLines={1}>
          {author} <ThemedText style={styles.metaDot}>•</ThemedText>{' '}
          {formatAnnouncementDate(item.createdAt)}
        </ThemedText>
      </View>
      <MaterialIcons name="chevron-right" size={25} color="#5D7396" />
    </Pressable>
  );
}

export default function AnnouncementsScreen() {
  const { groupId, refreshToken } = useLocalSearchParams<{
    groupId: string;
    refreshToken?: string;
  }>();
  const { groupId: contextGroupId, setActiveGroup, isReady } = useActiveGroupContext();
  const insets = useSafeAreaInsets();
  const groupIdValue = String(groupId ?? contextGroupId ?? '');
  const refreshTokenValue = String(refreshToken ?? '');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (groupId) void setActiveGroup({ groupId: String(groupId) });
  }, [groupId, setActiveGroup]);

  useEffect(() => {
    let cancelled = false;
    async function loadAnnouncements() {
      setLoading(true);
      setError(null);
      if (!groupIdValue) {
        if (!isReady) return;
        setError('Group not found.');
        setLoading(false);
        return;
      }
      try {
        const data = await getAnnouncementsByGroup(groupIdValue);
        if (!cancelled) setAnnouncements(data);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadAnnouncements();
    return () => {
      cancelled = true;
    };
  }, [groupIdValue, refreshTokenValue, isReady]);

  return (
    <ThemedView
      lightColor="#F5F9FF"
      darkColor="#F5F9FF"
      style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#102653" />
        </Pressable>
        <View style={styles.headerCopy}>
          <ThemedText type="title" style={styles.title}>
            Announcements
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Stay up to date with what&apos;s happening in your family group.
          </ThemedText>
        </View>
        <View style={styles.headerIcon}>
          <MaterialIcons name="notifications-none" size={26} color="#1476E8" />
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
        onPress={() =>
          router.push({ pathname: '/create-announcement', params: { groupId: groupIdValue } })
        }>
        <MaterialIcons name="add-circle-outline" size={23} color="#FFFFFF" />
        <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
          Create Announcement
        </ThemedText>
      </Pressable>

      {loading && <ThemedText style={styles.feedback}>Loading announcements...</ThemedText>}
      {!loading && error !== null && <ThemedText style={styles.feedbackError}>{error}</ThemedText>}
      {!loading && error === null && (
        <FlatList
          data={announcements}
          keyExtractor={(item, index) => String(item.id || index)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <AnnouncementListCard
              item={item}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/(main)/announcement/[announcementId]',
                  params: {
                    announcementId: item.id,
                    title: item.title,
                    body: item.body,
                    creatorDisplayName: item.creatorDisplayName ?? '',
                    createdAt: item.createdAt,
                    expiresAt: item.expiresAt ?? '',
                  },
                })
              }
            />
          )}
          ListEmptyComponent={<ThemedText style={styles.feedback}>No announcements yet.</ThemedText>}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  backButton: { marginRight: 12, paddingTop: 8 },
  headerCopy: { flex: 1 },
  title: { color: '#102653', fontSize: 30, lineHeight: 36 },
  subtitle: { maxWidth: 285, marginTop: 7, color: '#5D7396', fontSize: 16, lineHeight: 23 },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5F0FF',
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1476E8',
    shadowColor: '#1476E8',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonPressed: { opacity: 0.86 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16 },
  list: { gap: 12, paddingVertical: 20, paddingBottom: 32 },
  card: {
    minHeight: 126,
    padding: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#29466F',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 13,
    elevation: 3,
  },
  cardPressed: { opacity: 0.84 },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5F0FF',
  },
  cardContent: { flex: 1, gap: 5 },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  cardTitle: { flex: 1, color: '#102653', fontSize: 17, lineHeight: 22 },
  typePill: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#EAF2FF' },
  typeText: { color: '#2765AF', fontSize: 10, fontWeight: '700' },
  cardBody: { color: '#5D7396', fontSize: 14, lineHeight: 20 },
  cardMeta: { color: '#7183A0', fontSize: 12, lineHeight: 17 },
  metaDot: { color: '#A0ADC0', fontSize: 12 },
  feedback: { paddingTop: 28, textAlign: 'center', opacity: 0.7 },
  feedbackError: { paddingTop: 28, color: '#C0392B', textAlign: 'center', fontSize: 14 },
});
