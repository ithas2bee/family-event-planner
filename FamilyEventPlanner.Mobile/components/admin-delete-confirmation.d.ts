type DeleteConfirmationAlert = (
  title: string,
  message: string,
  buttons?: Array<{ text: string; onPress?: () => void }>,
) => void;

export function createAdminDeleteConfirmation(options: {
  contentType: string;
  onDelete: () => Promise<void>;
  onDeleted: () => void;
  setDeleting: (deleting: boolean) => void;
  showAlert: DeleteConfirmationAlert;
}): {
  title: string;
  message: string;
  buttons: Array<{
    text: string;
    style?: 'cancel' | 'destructive';
    onPress?: () => Promise<void>;
  }>;
};
