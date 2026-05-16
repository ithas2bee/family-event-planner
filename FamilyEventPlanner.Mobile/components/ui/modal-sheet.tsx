import React from 'react';
import { StyleSheet, Modal, ModalProps, View, ScrollView, Pressable } from 'react-native';
import { ThemedText } from '../themed-text';
import { Colors, Spacing, Radius, Typography } from './design-system';

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
          >
            {children}
          </ScrollView>

          {actions && (
            <View style={styles.actionContainer}>
              {actions}
            </View>
          )}
        </View>
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
  modal: {
    backgroundColor: Colors.modal,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    maxHeight: '85%',
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
  },
  actionContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
});
