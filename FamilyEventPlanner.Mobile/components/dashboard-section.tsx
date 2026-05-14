import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export type DashboardCardItem = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
};

type DashboardSectionProps = {
  title: string;
  items: DashboardCardItem[];
  loading?: boolean;
  emptyText?: string;
  viewAllLabel?: string;
  onViewAll: () => void;
  onCardPress?: (item: DashboardCardItem) => void;
};

export function DashboardSection({
  title,
  items,
  loading = false,
  emptyText = 'Nothing to preview yet.',
  viewAllLabel = 'View All',
  onViewAll,
  onCardPress,
}: DashboardSectionProps) {
  return (
    <ThemedView style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        <Pressable onPress={onViewAll} hitSlop={8}>
          <ThemedText type="defaultSemiBold" style={styles.viewAllText}>
            {viewAllLabel}
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowContent}
      >
        {loading ? (
          <ThemedView style={[styles.card, styles.placeholderCard]}>
            <ThemedText style={styles.placeholderText}>Loading...</ThemedText>
          </ThemedView>
        ) : items.length === 0 ? (
          <ThemedView style={[styles.card, styles.placeholderCard]}>
            <ThemedText style={styles.placeholderText}>{emptyText}</ThemedText>
          </ThemedView>
        ) : (
          items.map((item) => {
            const content = (
              <>
                <ThemedText type="defaultSemiBold" style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </ThemedText>
                {item.subtitle ? (
                  <ThemedText style={styles.cardSubtitle} numberOfLines={2}>
                    {item.subtitle}
                  </ThemedText>
                ) : null}
                {item.meta ? (
                  <ThemedText style={styles.cardMeta} numberOfLines={1}>
                    {item.meta}
                  </ThemedText>
                ) : null}
              </>
            );

            if (!onCardPress) {
              return (
                <ThemedView key={item.id} style={styles.card}>
                  {content}
                </ThemedView>
              );
            }

            return (
              <Pressable key={item.id} style={styles.card} onPress={() => onCardPress(item)}>
                {content}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
  },
  viewAllText: {
    color: '#0A7EA4',
    fontSize: 14,
  },
  rowContent: {
    gap: 10,
    paddingRight: 12,
  },
  card: {
    width: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5D8DC',
    padding: 12,
    gap: 6,
  },
  placeholderCard: {
    justifyContent: 'center',
  },
  placeholderText: {
    opacity: 0.7,
  },
  cardTitle: {
    fontSize: 15,
  },
  cardSubtitle: {
    fontSize: 13,
    opacity: 0.85,
  },
  cardMeta: {
    fontSize: 12,
    opacity: 0.6,
  },
});