import React from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    ModalProps,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { ThemedText } from '../themed-text';
import { Colors, Radius, Spacing, Typography } from './design-system';

interface ModalSheetProps extends Omit<ModalProps, 'transparent'> {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onClose: () => void;
}

/**
 * Base modal sheet component for consistent modal interactions
 */
export const ModalSheet: React.FC<ModalSheetProps> = ({
  visible,
  title,
  children,
  actions,
  onClose,
  ...props
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent {...props}>
      <View style={styles.overlay}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <KeyboardAvoidingView
          style={styles.keyboardArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}
        >
          <View style={styles.modal}>
            <View style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                {title}
              </ThemedText>
              <Pressable onPress={onClose} hitSlop={8}>
                <ThemedText style={styles.close}>✕</ThemedText>
              </Pressable>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {actions && (
              <View style={styles.actionContainer}>
                {actions}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  keyboardArea: {
    width: '100%',
  },
  modal: {
    backgroundColor: Colors.modal,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    height: '85%',
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: Typography.sizes.xl,
    color: Colors.text.primary,
    flex: 1,
  },
  close: {
    fontSize: Typography.sizes.lg,
    color: Colors.text.muted,
    padding: Spacing.md,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  actionContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
});
