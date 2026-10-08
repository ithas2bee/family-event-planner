import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export function CommunityDeleteButton({
  contentName,
  deleting,
  onPress,
  style,
}: {
  contentName: string;
  deleting: boolean;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Delete ${contentName}`}
      disabled={deleting}
      onPress={onPress}
      style={[styles.button, style]}
    >
      {deleting ? <ActivityIndicator size="small" color="#C0392B" /> : <MaterialIcons name="delete-outline" size={19} color="#C0392B" />}
      <ThemedText style={styles.buttonText}>
        {deleting ? `Deleting ${contentName}...` : `Delete ${contentName}`}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    marginTop: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF0EF',
  },
  buttonText: { color: '#C0392B', fontSize: 15, fontWeight: '700' },
});
