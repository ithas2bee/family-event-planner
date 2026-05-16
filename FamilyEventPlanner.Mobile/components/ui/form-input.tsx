import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { ThemedText } from '../themed-text';
import { Colors, Spacing, Radius, Typography } from './design-system';

interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  variant?: 'default' | 'hero';
}

/**
 * Consistent form input with optional label and error state
 */
export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  variant = 'default',
  style,
  ...props
}) => {
  const variantStyle = variant === 'hero' ? styles.heroInput : styles.input;

  return (
    <View style={styles.container}>
      {label && (
        <ThemedText type="defaultSemiBold" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <TextInput
        style={[variantStyle, error && styles.inputError, style]}
        placeholderTextColor={Colors.text.muted}
        {...props}
      />
      {error && (
        <ThemedText style={styles.errorText}>
          {error}
        </ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.input,
    color: Colors.text.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: Typography.sizes.base,
    marginBottom: Spacing.md,
  },
  heroInput: {
    color: Colors.text.primary,
    fontSize: Typography.sizes.xxl,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  inputError: {
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.sm,
  },
});
