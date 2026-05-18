import React from 'react';
import { Pressable, PressableProps, StyleSheet, View } from 'react-native';
import { ThemedText } from '../themed-text';
import { Colors, Radius, Spacing, Typography } from './design-system';

interface ImmersiveButtonProps extends PressableProps {
  children: string;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  icon?: React.ReactNode;
}

/**
 * Immersive button with consistent touch interaction and visual feedback
 */
export const ImmersiveButton: React.FC<ImmersiveButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  disabled = false,
  style,
  ...props
}) => {
  const variantStyle = {
    primary: styles.primary,
    secondary: styles.secondary,
    tertiary: styles.tertiary,
  }[variant];

  const sizeStyle = {
    small: styles.sizeSmall,
    medium: styles.sizeMedium,
    large: styles.sizeLarge,
  }[size];

  return (
    <Pressable
            style={(state) => [
        styles.base,
        variantStyle,
        sizeStyle,
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <ThemedText
        style={[
          styles.text,
          variant === 'primary' && styles.textPrimary,
          variant === 'secondary' && styles.textSecondary,
          variant === 'tertiary' && styles.textTertiary,
          size === 'small' && styles.textSmall,
          size === 'large' && styles.textLarge,
        ]}
      >
        {children}
      </ThemedText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.secondary,
  },
  tertiary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },

  // Sizes
  sizeSmall: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  sizeMedium: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  sizeLarge: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
  },

  // Text styling
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  textPrimary: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
  },
  textSecondary: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
  },
  textTertiary: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.base,
  },
  textSmall: {
    fontSize: Typography.sizes.sm,
  },
  textLarge: {
    fontSize: Typography.sizes.lg,
  },

  iconContainer: {
    marginRight: Spacing.md,
  },
});


