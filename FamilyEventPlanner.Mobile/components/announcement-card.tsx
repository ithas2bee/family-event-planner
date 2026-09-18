import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { DashboardCardItem } from '@/components/dashboard-section';
import { ThemedText } from '@/components/themed-text';

export type AnnouncementCardItem = DashboardCardItem & {
  message?: string;
  author?: string;
};

type AnnouncementCardProps = {
  item: AnnouncementCardItem;
  onPress: () => void;
};

export function getAnnouncementAccessibilityLabel(item: AnnouncementCardItem): string {
  const details = [item.title || 'Untitled announcement'];
  if (item.message) details.push(item.message);
  if (item.author) details.push(`Posted by ${item.author}`);
  details.push('Open announcements');
  return `${details.join('. ')}.`;
}

export function AnnouncementCard({ item, onPress }: AnnouncementCardProps) {
  const title = item.title || 'Untitled announcement';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(10,126,164,0.12)' }}
      accessibilityRole="button"
      accessibilityLabel={getAnnouncementAccessibilityLabel(item)}>
      <View style={styles.accent} />
      <View style={styles.content}>
        <View style={styles.eyebrow}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="campaign" size={18} color="#0A7EA4" />
          </View>
          <ThemedText style={styles.eyebrowText}>Announcement</ThemedText>
        </View>

        <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={2}>
          {title}
        </ThemedText>

        {item.message ? (
          <ThemedText style={styles.message} numberOfLines={3}>
            {item.message}
          </ThemedText>
        ) : null}

        {item.author ? (
          <ThemedText style={styles.author} numberOfLines={1}>
            Posted by {item.author}
          </ThemedText>
        ) : null}
      </View>
      <MaterialIcons name="arrow-forward" size={20} color="#0A7EA4" style={styles.arrow} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    minHeight: 188,
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DCE7EA',
    backgroundColor: '#F8FCFC',
    shadowColor: '#173B4A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  cardPressed: {
    opacity: 0.86,
  },
  accent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 5,
    backgroundColor: '#73C9D2',
  },
  content: {
    flex: 1,
    gap: 9,
    padding: 18,
    paddingLeft: 21,
    paddingRight: 42,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDF3F4',
  },
  eyebrowText: {
    color: '#0A7EA4',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 19,
    lineHeight: 24,
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  author: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    opacity: 0.6,
  },
  arrow: {
    position: 'absolute',
    right: 17,
    bottom: 17,
  },
});
