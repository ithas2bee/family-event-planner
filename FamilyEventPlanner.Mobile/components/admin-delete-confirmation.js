function createAdminDeleteConfirmation({
  contentType,
  onDelete,
  onDeleted,
  setDeleting,
  showAlert,
}) {
  return {
    title: `Delete ${contentType}?`,
    message: `This action cannot be undone. Are you sure you want to delete this ${contentType.toLowerCase()}?`,
    buttons: [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await onDelete();
            showAlert('Deleted', `${contentType} was deleted.`, [{ text: 'OK', onPress: onDeleted }]);
          } catch (error) {
            showAlert(
              'Unable to delete',
              error instanceof Error ? error.message : `Unable to delete this ${contentType.toLowerCase()}.`,
            );
          } finally {
            setDeleting(false);
          }
        },
      },
    ],
  };
}

module.exports = { createAdminDeleteConfirmation };
