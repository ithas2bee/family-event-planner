import React from 'react';
import { Pressable, StyleSheet, View, ViewProps } from 'react-native';
import { ThemedText } from '../themed-text';
import { Colors, Spacing, Typography } from './design-system';

interface SectionHeaderProps extends ViewProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Consistent section header with optional action button
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
  ...props
}) => {
  return (
    <View style={[styles.container, style]} {...props}>
      <View style={styles.titleContainer}>
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <ThemedText type="defaultSemiBold" style={styles.action}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.sizes.lg,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.muted,
  },
  action: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    marginLeft: Spacing.lg,
  },
});
