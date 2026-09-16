import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { DashboardCardItem } from '@/components/dashboard-section';
import { ThemedText } from '@/components/themed-text';

const KICKBACK_TONES = [
  { background: '#8B3A62', accent: '#FFD166', bubble: 'rgba(255,209,102,0.2)' },
  { background: '#9A4D2F', accent: '#FFE0A3', bubble: 'rgba(255,224,163,0.2)' },
  { background: '#3C557A', accent: '#A9E5BB', bubble: 'rgba(169,229,187,0.2)' },
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
  if (!expiresAtUtc) {
    return 'No end time';
  }

  const date = new Date(expiresAtUtc);
  if (Number.isNaN(date.getTime())) {
    return 'End time pending';
  }

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
  const responseLabel =
    item.currentMemberResponse === 'PullingUp'
      ? 'You are pulling up'
      : item.currentMemberResponse === 'Maybe'
        ? 'You might be there'
        : 'Tap to respond';
  const attendanceLabel = `${item.pullingUpCount ?? 0} pulling up • ${item.maybeCount ?? 0} maybe`;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.16)' }}
      accessibilityRole="button"
      accessibilityLabel={getKickbackAccessibilityLabel(item)}>
      <View style={[styles.decorativeLarge, { backgroundColor: tone.bubble }]} />
      <View style={[styles.decorativeSmall, { backgroundColor: tone.bubble }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.iconCircle, { backgroundColor: tone.accent }]}>
            <MaterialIcons name="local-fire-department" size={24} color={tone.background} />
          </View>
          <View style={styles.contextBadge}>
            <MaterialIcons name="groups" size={15} color="#FFFFFF" />
            <ThemedText style={styles.contextText}>Kickback</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.title} numberOfLines={2}>
          {title}
        </ThemedText>
        <ThemedText style={styles.note} numberOfLines={2}>
          {note}
        </ThemedText>

        <View style={styles.details}>
          <ThemedText style={styles.detailText} numberOfLines={1}>
            {formatExpiry(item.expiresAtUtc)}
          </ThemedText>
          <ThemedText style={styles.detailText} numberOfLines={1}>
            {attendanceLabel}
          </ThemedText>
        </View>

        <View style={styles.footer}>
          <ThemedText style={[styles.responseText, { color: tone.accent }]} numberOfLines={1}>
            {responseLabel}
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
    minHeight: 218,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#8B3A62',
    shadowColor: '#11213A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 6,
  },
  cardPressed: {
    opacity: 0.9,
  },
  content: {
    flex: 1,
    gap: 10,
    padding: 16,
  },
  decorativeLarge: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -62,
    top: -74,
  },
  decorativeSmall: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    left: 126,
    bottom: -56,
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
  contextText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 26,
  },
  note: {
    minHeight: 36,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 18,
  },
  details: {
    gap: 3,
  },
  detailText: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 'auto',
  },
  responseText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  ctaCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
