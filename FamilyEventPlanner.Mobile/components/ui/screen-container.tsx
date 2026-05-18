import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, ViewProps } from 'react-native';
import { Colors, Spacing } from './design-system';

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  withScroll?: boolean;
  withKeyboardAvoid?: boolean;
  padding?: number;
}

/**
 * Consistent screen wrapper with background, padding, and optional scroll/keyboard handling
 */
export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  withScroll = false,
  withKeyboardAvoid = false,
  padding = Spacing.lg,
  style,
  ...props
}) => {
  const content = (
    <View
      style={[
        styles.container,
        { paddingHorizontal: padding, paddingVertical: Spacing.lg },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );

  if (withKeyboardAvoid) {
    return (
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {withScroll ? (
          <ScrollView style={styles.scroll} contentContainerStyle={{ flexGrow: 1 }}>
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    );
  }

  if (withScroll) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={{ flexGrow: 1 }}>
        {content}
      </ScrollView>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.screen,
  },
  keyboardAvoid: {
    flex: 1,
    backgroundColor: Colors.screen,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.screen,
  },
});
