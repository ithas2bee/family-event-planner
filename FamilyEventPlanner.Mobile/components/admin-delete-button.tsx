import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type AdminDeleteButtonProps = {
  contentType: string;
  onDelete: () => Promise<void>;
  onDeleted: () => void;
};

export function AdminDeleteButton({ contentType, onDelete, onDeleted }: AdminDeleteButtonProps) {
  const [deleting, setDeleting] = useState(false);

  function confirmDelete() {
    Alert.alert(
      `Delete ${contentType}?`,
      `This action cannot be undone. Are you sure you want to delete this ${contentType.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleting(true);
              try {
                await onDelete();
                Alert.alert('Deleted', `${contentType} was deleted.`, [{ text: 'OK', onPress: onDeleted }]);
              } catch (error: unknown) {
                Alert.alert('Unable to delete', error instanceof Error ? error.message : `Unable to delete this ${contentType.toLowerCase()}.`);
              } finally {
                setDeleting(false);
              }
            })();
          },
        },
      ],
    );
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
