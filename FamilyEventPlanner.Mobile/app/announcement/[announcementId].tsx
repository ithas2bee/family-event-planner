import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatAnnouncementDate } from '@/services/announcementService';

export default function AnnouncementDetailsScreen() {
  const params = useLocalSearchParams<{
    title?: string;
    body?: string;
    creatorDisplayName?: string;
    createdAt?: string;
    expiresAt?: string;
  }>();
  const title = String(params.title ?? 'Untitled announcement');
  const body = String(params.body ?? '');
  const author = String(params.creatorDisplayName ?? 'Unknown member');
  const createdAt = String(params.createdAt ?? '');
  const expiresAt = String(params.expiresAt ?? '');
  return (
    <ThemedView lightColor="#F5F9FF" darkColor="#F5F9FF" style={styles.container}>
      <View style={styles.navigation}>
        <View style={styles.navigationSpacer} />
        <ThemedText type="defaultSemiBold" style={styles.navigationTitle}>
          Announcement
        </ThemedText>
        <View style={styles.navigationSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="campaign" size={28} color="#1476E8" />
            </View>
            <View style={styles.typePill}>
              <ThemedText style={styles.typeText}>Announcement</ThemedText>
            </View>
            <ThemedText style={styles.date}>{formatAnnouncementDate(createdAt)}</ThemedText>
          </View>
          <ThemedText type="title" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText style={styles.body}>{body || 'No message provided.'}</ThemedText>
          <View style={styles.divider} />
          <View style={styles.metadata}>
            <View style={styles.avatar}>
              <ThemedText type="defaultSemiBold" style={styles.avatarText}>
                {author.slice(0, 2).toUpperCase()}
              </ThemedText>
            </View>
            <View>
              <ThemedText style={styles.metadataLabel}>Posted by</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.author}>
                {author}
              </ThemedText>
            </View>
          </View>
          {expiresAt ? (
            <View style={styles.expiration}>
              <MaterialIcons name="schedule" size={18} color="#5D7396" />
              <ThemedText style={styles.expirationText}>
                Expires {formatAnnouncementDate(expiresAt)}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  navigation: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  navigationTitle: { color: '#102653', fontSize: 20 },
  navigationSpacer: { width: 27 },
  scrollContent: { paddingVertical: 18, paddingBottom: 32 },
  detailCard: {
    padding: 19,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#29466F',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  iconCircle: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5F0FF' },
  typePill: { borderRadius: 14, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: '#EAF2FF' },
  typeText: { color: '#2765AF', fontSize: 12, fontWeight: '700' },
  date: { flex: 1, color: '#5D7396', fontSize: 12, textAlign: 'right' },
  title: { color: '#102653', fontSize: 26, lineHeight: 32 },
  body: { marginTop: 12, color: '#5D7396', fontSize: 17, lineHeight: 27 },
  divider: { height: 1, marginVertical: 23, backgroundColor: '#DCE5F0' },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DCEBFF' },
  avatarText: { color: '#2765AF', fontSize: 16 },
  metadataLabel: { color: '#7183A0', fontSize: 13 },
  author: { color: '#102653', fontSize: 16 },
  expiration: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 20 },
  expirationText: { color: '#5D7396', fontSize: 13 },
});
