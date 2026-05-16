import React from 'react';
import { StyleSheet, Pressable, PressableProps } from 'react-native';
import { ThemedText } from '../themed-text';
import { Colors, Spacing, Radius, Typography } from './design-system';

interface PillButtonProps extends PressableProps {
  children: string;
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium';
}

/**
 * Pill-shaped button for compact, secondary actions
 */
export const PillButton: React.FC<PillButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'small',
  style,
  ...props
}) => {
  const variantStyle = variant === 'primary' ? styles.primary : styles.secondary;
  const sizeStyle = size === 'small' ? styles.sizeSmall : styles.sizeMedium;

  return (
    <Pressable
            style={(state) => [
        styles.base,
        variantStyle,
        sizeStyle,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <ThemedText
        style={[
          styles.text,
          variant === 'primary' && styles.textPrimary,
          size === 'small' && styles.textSmall,
        ]}
      >
        {children}
      </ThemedText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.secondary,
  },
  pressed: {
    opacity: 0.75,
  },

  // Sizes
  sizeSmall: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  sizeMedium: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },

  // Text
  text: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  textSmall: {
    fontSize: Typography.sizes.xs,
  },
  textPrimary: {
    color: Colors.text.primary,
  },
});

