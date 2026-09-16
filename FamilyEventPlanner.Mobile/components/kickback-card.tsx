import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { DashboardCardItem } from '@/components/dashboard-section';
import { ThemedText } from '@/components/themed-text';

const KICKBACK_TONES = [
  { background: '#172536', accent: '#E8D9FF', bubble: 'rgba(255,117,91,0.48)' },
  { background: '#12677A', accent: '#D9F8FF', bubble: 'rgba(255,177,67,0.42)' },
  { background: '#6B351F', accent: '#FFE5C4', bubble: 'rgba(255,213,79,0.38)' },
  { background: '#345E28', accent: '#E7F8D0', bubble: 'rgba(132,201,96,0.42)' },
];

export type KickbackCardItem = DashboardCardItem & {
  note?: string;
  expiresAtUtc?: string;
  creator?: string;
  pullingUpCount?: number;
  maybeCount?: number;
  currentMemberResponse?: 'PullingUp' | 'Maybe' | null;
};

type KickbackCardProps = {
  item: KickbackCardItem;
  index: number;
  onPress: () => void;
};

function formatExpiry(expiresAtUtc?: string): string {
  if (!expiresAtUtc) return 'No end time';
  const date = new Date(expiresAtUtc);
  if (Number.isNaN(date.getTime())) return 'End time pending';

  return `Until ${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)}`;
}

export function getKickbackAccessibilityLabel(item: KickbackCardItem): string {
  const response = item.currentMemberResponse ? ` Your response: ${item.currentMemberResponse}.` : '';
  return `${item.title || 'Kickback'}. ${item.note || 'No note yet.'} ${formatExpiry(item.expiresAtUtc)}.${response} Open kickback details.`;
}

export function KickbackCard({ item, index, onPress }: KickbackCardProps) {
  const tone = KICKBACK_TONES[index % KICKBACK_TONES.length];
  const title = item.title || 'Kickback';
  const detailLabel = `${item.pullingUpCount ?? 0} pulling up • ${item.maybeCount ?? 0} maybe`;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: tone.background },
        pressed ? styles.cardPressed : null,
      ]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.16)' }}
      accessibilityRole="button"
      accessibilityLabel={getKickbackAccessibilityLabel(item)}>
      <View style={[styles.decorativeLarge, { backgroundColor: tone.bubble }]} />
      <View style={[styles.decorativeSmall, { backgroundColor: tone.bubble }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.iconCircle, { backgroundColor: tone.accent }]}>
            <MaterialIcons name="chat-bubble-outline" size={24} color={tone.background} />
          </View>
          <View style={styles.contextBadge}>
            <View style={styles.contextDot} />
            <ThemedText style={styles.contextText}>Kickback</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.title} numberOfLines={2}>
          {title}
        </ThemedText>

        <View style={styles.footer}>
          <ThemedText style={styles.note} numberOfLines={1}>
            {detailLabel}
          </ThemedText>
          <View style={styles.ctaCircle}>
            <MaterialIcons name="arrow-forward" size={20} color={tone.background} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    minHeight: 142,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#11213A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  cardPressed: {
    opacity: 0.88,
  },
  content: {
    flex: 1,
    gap: 12,
    padding: 16,
  },
  decorativeLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -54,
    top: -72,
  },
  decorativeSmall: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    left: 112,
    bottom: -52,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.17)',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  contextDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#9AFFC5',
  },
  contextText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 24,
  },
  note: {
    flex: 1,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  ctaCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
});
