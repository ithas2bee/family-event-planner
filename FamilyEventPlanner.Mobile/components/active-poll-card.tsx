import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { DashboardCardItem } from '@/components/dashboard-section';
import { ThemedText } from '@/components/themed-text';

const POLL_TONES = [
  { background: '#355070', badge: '#4F7CAC', bubble: 'rgba(255,255,255,0.16)' },
  { background: '#5B4B8A', badge: '#7664B8', bubble: 'rgba(255,255,255,0.16)' },
  { background: '#176B87', badge: '#238EAD', bubble: 'rgba(255,255,255,0.16)' },
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

function getPollAccessibilityLabel(item: ActivePollCardItem): string {
  const details = [
    typeof item.optionCount === 'number' ? `${item.optionCount} options` : null,
    typeof item.voteCount === 'number' ? `${item.voteCount} votes` : null,
  ].filter((detail): detail is string => detail !== null);

  return [item.title, 'Family poll', ...details].join('. ');
}

export function ActivePollCard({ item, index, onPress }: ActivePollCardProps) {
  const tone = POLL_TONES[index % POLL_TONES.length];
  const countLabel = [
    typeof item.optionCount === 'number' ? `${item.optionCount} option${item.optionCount === 1 ? '' : 's'}` : null,
    typeof item.voteCount === 'number' ? `${item.voteCount} vote${item.voteCount === 1 ? '' : 's'}` : null,
  ]
    .filter((detail): detail is string => detail !== null)
    .join(' • ');

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(53,80,112,0.12)' }}
      accessibilityRole="button"
      accessibilityLabel={getPollAccessibilityLabel(item)}>
      <View style={[styles.header, { backgroundColor: tone.background }]}>
        <View style={[styles.headerBubbleLarge, { backgroundColor: tone.bubble }]} />
        <View style={[styles.headerBubbleSmall, { backgroundColor: tone.bubble }]} />

        <View style={styles.headerTopRow}>
          <View style={[styles.iconBubble, { backgroundColor: tone.bubble }]}>
            <MaterialIcons name="poll" size={24} color="#FFFFFF" />
          </View>
          <View style={[styles.statusBadge, { backgroundColor: tone.badge }]}>
            <ThemedText style={styles.statusText}>Family poll</ThemedText>
          </View>
        </View>

        <ThemedText type="defaultSemiBold" style={styles.question} numberOfLines={2}>
          {item.title}
        </ThemedText>
      </View>

      <View style={styles.footer}>
        {countLabel ? (
          <ThemedText style={styles.countText} numberOfLines={1}>
            {countLabel}
          </ThemedText>
        ) : (
          <ThemedText style={styles.countText} numberOfLines={1}>
            Family decision
          </ThemedText>
        )}
        <View style={styles.ctaCircle}>
          <MaterialIcons name="arrow-forward" size={20} color="#355070" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 320,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#11213A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
  cardPressed: {
    opacity: 0.96,
  },
  header: {
    minHeight: 124,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 15,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  question: {
    color: '#FFFFFF',
    fontSize: 19,
    lineHeight: 24,
    paddingRight: 26,
  },
  headerBubbleLarge: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    right: -28,
    top: 18,
  },
  headerBubbleSmall: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    left: 116,
    top: -24,
  },
  footer: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  countText: {
    flex: 1,
    color: '#31435F',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  ctaCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF4FB',
  },
});
