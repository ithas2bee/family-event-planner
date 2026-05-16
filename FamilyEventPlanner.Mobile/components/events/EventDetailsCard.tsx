import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '../themed-text';
import { GlassCard } from '../ui/glass-card';
import { PillButton } from '../ui/pill-button';
import { Colors, Spacing, Radius, Typography } from '../ui/design-system';

interface EventDetailsCardProps {
  title: string;
  date: string;
  location: string;
  onPressDate: () => void;
  onPressLocation: () => void;
  onPressSettings: () => void;
  showSettings?: boolean;
}

/**
 * Immersive event details card using design system
 * showSettings controls visibility of the "Advanced Settings" button (creator-only)
 */
export const EventDetailsCard: React.FC<EventDetailsCardProps> = ({
  title,
  date,
  location,
  onPressDate,
  onPressLocation,
  onPressSettings,
  showSettings = false,
}) => {
  return (
    <GlassCard style={styles.card}>
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Event Title
        </ThemedText>
        <ThemedText style={styles.value}>{title}</ThemedText>
      </View>

      <Pressable style={styles.row} onPress={onPressDate}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Date & Time
        </ThemedText>
        <ThemedText style={styles.value}>{date || 'Select date & time'}</ThemedText>
      </Pressable>

      <Pressable style={styles.row} onPress={onPressLocation}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Location
        </ThemedText>
        <ThemedText style={styles.value}>{location || 'Add location'}</ThemedText>
      </Pressable>

      {showSettings && (
        <View style={styles.actionRow}>
          <PillButton variant="secondary" size="small" onPress={onPressSettings}>
            Advanced Settings
          </PillButton>
        </View>
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: -40,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.sm,
  },
  value: {
    color: Colors.text.secondary,
    fontSize: Typography.sizes.base,
  },
  row: {
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  actionRow: {
    marginTop: Spacing.lg,
    alignItems: 'flex-end',
  },
});
