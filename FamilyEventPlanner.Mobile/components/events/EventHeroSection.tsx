import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '../themed-text';
import { Colors, Spacing, Typography } from '../ui/design-system';
import { HeroGradientOverlay } from '../ui/hero-gradient-overlay';

interface EventHeroSectionProps {
  title: string;
  children?: React.ReactNode;
  height?: number;
  glowScale?: number;
}

/**
 * Immersive event hero section with cinematic gradient overlay
 * Uses design system for consistent styling across event screens
 */
export const EventHeroSection: React.FC<EventHeroSectionProps> = ({
  title,
  children,
  height = 220,
  glowScale = 1,
}) => {
  return (
    <HeroGradientOverlay height={height} glowScale={glowScale}>
      <View style={[styles.content, { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl }]}>
        <ThemedText type="title" style={styles.title}>
          {title}
        </ThemedText>
        {children}
      </View>
    </HeroGradientOverlay>
  );
};

const styles = StyleSheet.create({
  content: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  title: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.hero,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
});
