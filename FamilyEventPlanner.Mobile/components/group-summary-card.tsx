import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { DashboardCardItem } from '@/components/dashboard-section';
import { ThemedText } from '@/components/themed-text';
import type { GroupMember } from '@/services/groupMemberService';

export type GroupSummaryCardItem = DashboardCardItem & {
  members?: GroupMember[];
  memberCount?: number;
  eventCount?: number;
  announcementCount?: number;
  pollCount?: number;
};

type GroupSummaryCardProps = {
  item: GroupSummaryCardItem;
  onPress: () => void;
};

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || '?';
}

export function getGroupSummaryAccessibilityLabel(item: GroupSummaryCardItem): string {
  const details = [item.title, item.subtitle ?? 'Active group'];
  if (item.memberCount !== undefined) {
    details.push(`${item.memberCount} member${item.memberCount === 1 ? '' : 's'}`);
  }
  if (item.eventCount !== undefined) details.push(`${item.eventCount} events`);
  if (item.announcementCount !== undefined) details.push(`${item.announcementCount} announcements`);
  if (item.pollCount !== undefined) details.push(`${item.pollCount} polls`);
  details.push('Open group');
  return `${details.join('. ')}.`;
}

export function GroupSummaryCard({ item, onPress }: GroupSummaryCardProps) {
  const members = item.members?.slice(0, 4) ?? [];
  const activity = [
    item.eventCount !== undefined ? { icon: 'event' as const, label: `${item.eventCount} Events`, tone: 'blue' } : null,
    item.announcementCount !== undefined
      ? { icon: 'campaign' as const, label: `${item.announcementCount} Announcements`, tone: 'pink' }
      : null,
    item.pollCount !== undefined ? { icon: 'poll' as const, label: `${item.pollCount} Polls`, tone: 'purple' } : null,
  ].filter((entry): entry is { icon: 'event' | 'campaign' | 'poll'; label: string; tone: string } => entry !== null);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(10,126,164,0.12)' }}
      accessibilityRole="button"
      accessibilityLabel={getGroupSummaryAccessibilityLabel(item)}
    >
      <View style={styles.topRow}>
        <View style={styles.groupIcon}>
          <MaterialIcons name="groups" size={38} color="#0A9B67" />
        </View>
        <View style={styles.identity}>
          <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={1}>
            {item.title}
          </ThemedText>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <ThemedText style={styles.statusText}>{item.subtitle ?? 'Active group'}</ThemedText>
            {item.memberCount !== undefined ? (
              <>
                <View style={styles.separatorDot} />
                <ThemedText style={styles.statusText}>
                  {item.memberCount} member{item.memberCount === 1 ? '' : 's'}
                </ThemedText>
              </>
            ) : null}
          </View>
        </View>
        <MaterialIcons name="arrow-forward-ios" size={22} color="#10233D" />
      </View>

      <View style={styles.middleRow}>
        <View style={styles.avatarRow}>
          {members.map((member, index) => {
            const name = member.displayName?.trim() || 'Unknown Member';
            return (
              <View key={member.memberId ?? `${name}-${index}`} style={[styles.avatar, index > 0 ? styles.avatarOverlap : null]}>
                <ThemedText style={styles.avatarText}>{getInitials(name)}</ThemedText>
              </View>
            );
          })}
          {item.memberCount !== undefined && item.memberCount > members.length ? (
            <View style={[styles.avatar, members.length > 0 ? styles.avatarOverlap : null]}>
              <ThemedText style={styles.avatarText}>+{item.memberCount - members.length}</ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText style={styles.description} numberOfLines={2}>
          Family events, updates and more...
        </ThemedText>
      </View>

      {activity.length > 0 ? (
        <View style={styles.activityRow}>
          {activity.map((entry) => (
            <View key={entry.label} style={[styles.activityPill, styles[`${entry.tone}Pill` as 'bluePill' | 'pinkPill' | 'purplePill']]}>
              <MaterialIcons name={entry.icon} size={18} color={styles[`${entry.tone}Icon` as 'blueIcon' | 'pinkIcon' | 'purpleIcon'].color} />
              <ThemedText style={styles.activityText} numberOfLines={1}>
                {entry.label}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 340,
    minHeight: 224,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#DCEFE9',
    padding: 18,
    gap: 18,
    backgroundColor: '#F7FCFA',
    shadowColor: '#173B4A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  cardPressed: {
    opacity: 0.86,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D9F5E9',
  },
  identity: {
    flex: 1,
    gap: 5,
  },
  title: {
    fontSize: 20,
    lineHeight: 25,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0AB56F',
  },
  separatorDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#168466',
  },
  statusText: {
    color: '#5D6A7E',
    fontSize: 14,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 116,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F7FCFA',
    backgroundColor: '#DCEAF0',
  },
  avatarOverlap: {
    marginLeft: -12,
  },
  avatarText: {
    color: '#174B5C',
    fontSize: 13,
    fontWeight: '700',
  },
  description: {
    flex: 1,
    color: '#5D6A7E',
    fontSize: 14,
    lineHeight: 20,
  },
  activityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bluePill: { backgroundColor: '#E1EEFF' },
  pinkPill: { backgroundColor: '#FCE5F0' },
  purplePill: { backgroundColor: '#EEE8FF' },
  blueIcon: { color: '#1672D4' },
  pinkIcon: { color: '#E32973' },
  purpleIcon: { color: '#7655D8' },
  activityText: {
    color: '#284A75',
    fontSize: 13,
    fontWeight: '600',
  },
});
