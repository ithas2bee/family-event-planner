import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { Colors, Radius, Shadow, Spacing } from './design-system';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated';
  padding?: number;
}

/**
 * Reusable glass card with consistent styling
 * Used for displaying information in an immersive, glassmorphic way
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'default',
  padding = Spacing.xl,
  style,
  ...props
}) => {
  const baseStyle = [
    styles.card,
    variant === 'elevated' ? styles.elevated : undefined,
    { padding },
    style,
  ];

  return (
    <View style={baseStyle} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    ...Shadow.md,
  },
  elevated: {
    ...Shadow.lg,
  },
});
