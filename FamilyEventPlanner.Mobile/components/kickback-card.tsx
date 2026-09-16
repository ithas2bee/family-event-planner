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
  const note = item.note?.trim() || 'No note yet.';
  const detailLabel = item.note?.trim()
    ? note
    : `${item.pullingUpCount ?? 0} pulling up • ${item.maybeCount ?? 0} maybe`;

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
        <View style={[styles.iconCircle, { backgroundColor: tone.accent }]}>
          <MaterialIcons name="chat-bubble-outline" size={27} color="#1976F3" />
        </View>

        <View style={styles.textContent}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {title}
          </ThemedText>
          <ThemedText style={styles.note} numberOfLines={1}>
            {detailLabel}
          </ThemedText>
        </View>

        <View style={styles.ctaCircle}>
          <MaterialIcons name="arrow-forward" size={22} color="#FFFFFF" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    height: 122,
    borderRadius: 18,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  decorativeLarge: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    right: -54,
    top: -85,
  },
  decorativeSmall: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    left: 160,
    bottom: -58,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  note: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
  },
  ctaCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(24,36,54,0.58)',
  },
});
