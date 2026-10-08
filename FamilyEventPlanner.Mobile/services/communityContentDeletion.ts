import { Alert } from 'react-native';

export function confirmCommunityContentDeletion({
  contentName,
  onDelete,
  onDeleted,
  onDeleting,
}: {
  contentName: string;
  onDelete: () => Promise<void>;
  onDeleted: () => void;
  onDeleting: (deleting: boolean) => void;
}): void {
  Alert.alert(
    `Delete ${contentName}?`,
    `This permanently deletes the ${contentName.toLowerCase()} and cannot be undone.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          onDeleting(true);
          try {
            await onDelete();
            Alert.alert(`${contentName} deleted`, `The ${contentName.toLowerCase()} was deleted successfully.`, [
              { text: 'OK', onPress: onDeleted },
            ]);
          } catch (error) {
            Alert.alert(
              `Unable to delete ${contentName.toLowerCase()}`,
              error instanceof Error ? error.message : 'Please try again.',
            );
          } finally {
            onDeleting(false);
          }
        },
      },
    ],
  );
}
