import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { DashboardCardItem } from '@/components/dashboard-section';
import { ThemedText } from '@/components/themed-text';

const POLL_TONES = [
  { background: '#263D8F', accent: '#8CA7FF', bubble: 'rgba(137,164,255,0.25)' },
  { background: '#176D72', accent: '#73E0D5', bubble: 'rgba(115,224,213,0.22)' },
  { background: '#81402D', accent: '#FFC084', bubble: 'rgba(255,192,132,0.24)' },
];

export type ActivePollCardItem = DashboardCardItem & {
  optionCount?: number;
  voteCount?: number;
};

type ActivePollCardProps = {
  item: ActivePollCardItem;
  index: number;
  onPress: () => void;
};

export function getPollAccessibilityLabel(item: ActivePollCardItem): string {
  const details = ['Active poll'];

  if (item.optionCount !== undefined) {
    details.push(`${item.optionCount} option${item.optionCount === 1 ? '' : 's'}`);
  }

  if (item.voteCount !== undefined) {
    details.push(`${item.voteCount} vote${item.voteCount === 1 ? '' : 's'}`);
  }

  return `${item.title}. ${details.join('. ')}.`;
}

export function ActivePollCard({ item, index, onPress }: ActivePollCardProps) {
  const tone = POLL_TONES[index % POLL_TONES.length];
  const countParts = [
    item.optionCount !== undefined
      ? `${item.optionCount} option${item.optionCount === 1 ? '' : 's'}`
      : null,
    item.voteCount !== undefined ? `${item.voteCount} vote${item.voteCount === 1 ? '' : 's'}` : null,
  ].filter((part): part is string => part !== null);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: tone.background }, pressed ? styles.cardPressed : null]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.16)' }}
      accessibilityRole="button"
      accessibilityLabel={getPollAccessibilityLabel(item)}>
      <View style={[styles.decorativeLarge, { backgroundColor: tone.bubble }]} />
      <View style={[styles.decorativeSmall, { backgroundColor: tone.bubble }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.iconCircle, { backgroundColor: tone.accent }]}>
            <MaterialIcons name="poll" size={24} color={tone.background} />
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <ThemedText style={styles.statusText}>Active</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.title} numberOfLines={2}>
          {item.title}
        </ThemedText>

        <View style={styles.footer}>
          {countParts.length > 0 ? (
            <ThemedText style={styles.countText} numberOfLines={1}>
              {countParts.join(' • ')}
            </ThemedText>
          ) : (
            <View />
          )}
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.17)',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#9AFFC5',
  },
  statusText: {
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  countText: {
    flex: 1,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
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
