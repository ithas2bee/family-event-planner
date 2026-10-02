import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { getKickbacksByGroup, type Kickback } from '@/services/kickbackService';

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

export default function KickbackDetailsScreen() {
  const { kickbackId, groupId, memberId } = useLocalSearchParams<{
    kickbackId: string;
    groupId: string;
    memberId: string;
  }>();
  const [kickback, setKickback] = useState<Kickback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadKickback() {
      try {
        const kickbacks = await getKickbacksByGroup(String(groupId ?? ''));
        const result = kickbacks.find((item) => item.id === String(kickbackId ?? ''));
        if (!result) throw new Error('Kickback not found.');
        if (!cancelled) {
          setKickback(result);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load kickback.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadKickback();
    return () => {
      cancelled = true;
    };
  }, [groupId, kickbackId]);

  const isCreator = Boolean(kickback?.createdByMemberId && kickback.createdByMemberId === memberId);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={23} color="#17345D" />
        </Pressable>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#237AF1" />
          </View>
        ) : error || !kickback ? (
          <View style={styles.centered}>
            <ThemedText type="title" style={styles.title}>Kickback Not Found</ThemedText>
            <ThemedText style={styles.description}>{error || 'No kickback data available.'}</ThemedText>
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <ThemedText style={styles.statusText}>Happening Now</ThemedText>
            </View>
            <ThemedText type="title" style={styles.title}>{kickback.vibe || 'Kickback'}</ThemedText>
            {kickback.note ? <ThemedText style={styles.description}>{kickback.note}</ThemedText> : null}

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <MaterialIcons name="schedule" size={20} color="#087AC5" />
                <View style={styles.infoCopy}>
                  <ThemedText style={styles.infoLabel}>Started</ThemedText>
                  <ThemedText style={styles.infoValue}>{formatTime(kickback.createdAtUtc)}</ThemedText>
                </View>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="hourglass-bottom" size={20} color="#087AC5" />
                <View style={styles.infoCopy}>
                  <ThemedText style={styles.infoLabel}>Ends</ThemedText>
                  <ThemedText style={styles.infoValue}>{formatTime(kickback.expiresAtUtc)}</ThemedText>
                </View>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="people" size={20} color="#087AC5" />
                <View style={styles.infoCopy}>
                  <ThemedText style={styles.infoLabel}>Joining</ThemedText>
                  <ThemedText style={styles.infoValue}>
                    {kickback.pullingUpCount} pulling up · {kickback.maybeCount} maybe
                  </ThemedText>
                </View>
              </View>
            </View>

            {isCreator ? (
              <Pressable
                style={styles.editButton}
                accessibilityRole="button"
                accessibilityLabel="Edit Kickback"
                onPress={() => router.push({
                  pathname: '/create-kickback',
                  params: { kickbackId: kickback.id, groupId: String(groupId), memberId: String(memberId ?? '') },
                })}>
                <MaterialIcons name="edit" size={19} color="#FFFFFF" />
                <ThemedText style={styles.editButtonText}>Edit Kickback</ThemedText>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F8FC' },
  container: { flex: 1, padding: 20 },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF2F6' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  content: { flex: 1, paddingTop: 26, gap: 16 },
  statusBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 16, backgroundColor: '#E8F6EE', paddingHorizontal: 12, paddingVertical: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#21865B' },
  statusText: { color: '#21865B', fontSize: 13, lineHeight: 17, fontWeight: '700' },
  title: { color: '#112953', fontSize: 29, lineHeight: 35, fontWeight: '800' },
  description: { color: '#536B88', fontSize: 16, lineHeight: 23 },
  infoCard: { borderRadius: 20, backgroundColor: '#FFFFFF', padding: 18, gap: 18, shadowColor: '#203B5A', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoCopy: { flex: 1, gap: 2 },
  infoLabel: { color: '#6C809D', fontSize: 12, lineHeight: 16, fontWeight: '600' },
  infoValue: { color: '#203B5A', fontSize: 15, lineHeight: 20, fontWeight: '700' },
  editButton: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 18, backgroundColor: '#237AF1', marginTop: 'auto' },
  editButtonText: { color: '#FFFFFF', fontSize: 16, lineHeight: 21, fontWeight: '800' },
});
