import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { DashboardCardItem } from '@/components/dashboard-section';
import { ThemedText } from '@/components/themed-text';

const EVENT_TONES = [
  {
    background: '#1F6FE5',
    bubble: 'rgba(255,255,255,0.18)',
    badge: '#2F80FF',
    icon: 'celebration' as const,
  },
  {
    background: '#6C47FF',
    bubble: 'rgba(255,255,255,0.18)',
    badge: '#7E61FF',
    icon: 'music-note' as const,
  },
  {
    background: '#1D8F78',
    bubble: 'rgba(255,255,255,0.18)',
    badge: '#27AE60',
    icon: 'local-activity' as const,
  },
  {
    background: '#F08A24',
    bubble: 'rgba(255,255,255,0.18)',
    badge: '#FF9F43',
    icon: 'cake' as const,
  },
];

type EventTone = (typeof EVENT_TONES)[number];

export type UpcomingEventCardItem = DashboardCardItem & {
  startDate: string;
  location?: string;
  host?: string;
  participantCount?: number;
  isNextUp?: boolean;
};

type UpcomingEventCardProps = {
  item: UpcomingEventCardItem;
  index: number;
  onPress: () => void;
};

function formatEventDateParts(startDate: string) {
  const parsedDate = new Date(startDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return {
      monthDay: 'TBD',
      shortDate: startDate || 'Date pending',
      time: 'Time pending',
    };
  }

  return {
    monthDay: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(parsedDate),
    shortDate: new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(parsedDate),
    time: new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(parsedDate),
  };
}

function getStatusLabel(startDate: string, isNextUp?: boolean) {
  const parsedDate = new Date(startDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return isNextUp ? 'Next Up' : 'Coming Soon';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDay = new Date(parsedDate);
  eventDay.setHours(0, 0, 0, 0);

  const dayDifference = Math.round((eventDay.getTime() - today.getTime()) / 86400000);

  if (isNextUp && dayDifference >= 0) {
    return 'Next Up';
  }

  if (dayDifference < 0) {
    return 'Passed';
  }

  if (dayDifference === 0) {
    return 'Today';
  }

  if (dayDifference === 1) {
    return 'Tomorrow';
  }

  return `In ${dayDifference} day${dayDifference === 1 ? '' : 's'}`;
}

function getEventTone(title: string, index: number): EventTone {
  const normalizedTitle = title.toLowerCase();

  if (normalizedTitle.includes('birthday')) {
    return EVENT_TONES[3];
  }

  if (normalizedTitle.includes('dance') || normalizedTitle.includes('recital') || normalizedTitle.includes('concert')) {
    return EVENT_TONES[1];
  }

  if (
    normalizedTitle.includes('school') ||
    normalizedTitle.includes('graduation') ||
    normalizedTitle.includes('picnic')
  ) {
    return EVENT_TONES[2];
  }

  return EVENT_TONES[index % EVENT_TONES.length];
}

export function UpcomingEventCard({ item, index, onPress }: UpcomingEventCardProps) {
  const tone = getEventTone(item.title, index);
  const dateParts = formatEventDateParts(item.startDate);
  const statusLabel = getStatusLabel(item.startDate, item.isNextUp);
  const contextLabel =
    item.participantCount && item.participantCount > 0
      ? `${item.participantCount} plan${item.participantCount === 1 ? '' : 's'} assigned`
      : 'Family event';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(53,80,112,0.08)' }}
      accessibilityRole="button">
      <View style={[styles.header, { backgroundColor: tone.background }]}>
        <View style={[styles.headerBubbleLarge, { backgroundColor: tone.bubble }]} />
        <View style={[styles.headerBubbleSmall, { backgroundColor: tone.bubble }]} />

        <View style={styles.headerTopRow}>
          <View style={[styles.headerIcon, { backgroundColor: tone.bubble }]}>
            <MaterialIcons name={tone.icon} size={20} color="#FFFFFF" />
          </View>

          <View style={[styles.statusBadge, { backgroundColor: tone.badge }]}>
            <ThemedText style={styles.statusBadgeText}>{statusLabel}</ThemedText>
          </View>
        </View>

        <View style={styles.headerDatePill}>
          <ThemedText style={styles.headerDateText}>{dateParts.monthDay}</ThemedText>
        </View>
      </View>

      <View style={styles.content}>
        <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={2}>
          {item.title}
        </ThemedText>

        <View style={styles.infoGroup}>
          <View style={styles.infoRow}>
            <MaterialIcons name="event" size={16} color="#355070" />
            <View style={styles.infoTextGroup}>
              <ThemedText style={styles.infoPrimary}>{dateParts.shortDate}</ThemedText>
              <ThemedText style={styles.infoSecondary}>{dateParts.time}</ThemedText>
            </View>
          </View>

          {item.location ? (
            <View style={styles.infoRow}>
              <MaterialIcons name="place" size={16} color="#355070" />
              <ThemedText style={styles.infoPrimary} numberOfLines={1}>
                {item.location}
              </ThemedText>
            </View>
          ) : null}

          {item.host ? (
            <View style={styles.infoRow}>
              <MaterialIcons name="person" size={16} color="#355070" />
              <ThemedText style={styles.infoPrimary} numberOfLines={1}>
                Hosted by {item.host}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <View style={styles.contextChip}>
            <MaterialIcons name="groups" size={16} color="#355070" />
            <ThemedText style={styles.contextChipText} numberOfLines={1}>
              {contextLabel}
            </ThemedText>
          </View>

          <View style={styles.ctaCircle}>
            <MaterialIcons name="chevron-right" size={20} color="#355070" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 258,
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
    minHeight: 112,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  headerDatePill: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  headerDateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  headerBubbleLarge: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 62,
    right: -22,
    top: 20,
  },
  headerBubbleSmall: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    left: 98,
    top: -16,
  },
  content: {
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    color: '#1F2A44',
  },
  infoGroup: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoTextGroup: {
    gap: 1,
    flexShrink: 1,
  },
  infoPrimary: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 18,
    color: '#31435F',
    fontWeight: '600',
  },
  infoSecondary: {
    fontSize: 13,
    lineHeight: 17,
    color: '#6B7A90',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  contextChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: '#EFF4FB',
    paddingHorizontal: 12,
  },
  contextChipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 16,
    color: '#355070',
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
