import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { createAdminDeleteConfirmation } from './admin-delete-confirmation.js';

type AdminDeleteButtonProps = {
  contentType: string;
  onDelete: () => Promise<void>;
  onDeleted: () => void;
};

export function AdminDeleteButton({ contentType, onDelete, onDeleted }: AdminDeleteButtonProps) {
  const [deleting, setDeleting] = useState(false);

  function confirmDelete() {
    const confirmation = createAdminDeleteConfirmation({
      contentType,
      onDelete,
      onDeleted,
      setDeleting,
      showAlert: (title, message, buttons) => Alert.alert(title, message, buttons),
    });
    Alert.alert(confirmation.title, confirmation.message, confirmation.buttons);
  }

  return (
    <Pressable
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={`Delete ${contentType}`}
      disabled={deleting}
      onPress={confirmDelete}>
      <MaterialIcons name="delete-outline" size={20} color="#FFFFFF" />
      <ThemedText style={styles.buttonText}>{deleting ? 'Deleting…' : `Delete ${contentType}`}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: '#B42318',
    marginTop: 12,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, lineHeight: 21, fontWeight: '800' },
});
