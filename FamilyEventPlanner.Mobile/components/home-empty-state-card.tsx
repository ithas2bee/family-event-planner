import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View, type ComponentProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type HomeEmptyStateCardProps = {
  title: string;
  message: string;
  supportingText: string;
  actionLabel: string;
  icon: ComponentProps<typeof MaterialIcons>['name'];
  colors: {
    background: string;
    iconBackground: string;
    icon: string;
    action: string;
  };
  onCreate: () => void;
};

export function HomeEmptyStateCard({
  title,
  message,
  supportingText,
  actionLabel,
  icon,
  colors,
  onCreate,
}: HomeEmptyStateCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.background }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.iconBackground }]}>
        <MaterialIcons name={icon} size={36} color={colors.icon} />
      </View>
      <View style={styles.copy}>
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText style={styles.message}>{message}</ThemedText>
        <ThemedText style={styles.supportingText}>{supportingText}</ThemedText>
        <Pressable
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          onPress={onCreate}
          style={[styles.action, { backgroundColor: colors.action }]}
        >
          <MaterialIcons name="add-circle-outline" size={23} color="#FFFFFF" />
          <ThemedText type="defaultSemiBold" style={styles.actionText}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      </View>
      <MaterialIcons name={icon} size={88} color={colors.icon} style={styles.illustration} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 340,
    minHeight: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#17345D',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  iconCircle: {
    position: 'absolute',
    top: 18,
    left: 18,
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
  },
  copy: {
    flex: 1,
    gap: 5,
    paddingTop: 62,
  },
  title: {
    color: '#10264C',
    fontSize: 20,
    lineHeight: 25,
  },
  message: {
    color: '#526987',
    fontSize: 17,
    lineHeight: 23,
  },
  supportingText: {
    maxWidth: 215,
    color: '#71819A',
    fontSize: 14,
    lineHeight: 20,
  },
  action: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    marginTop: 6,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  illustration: {
    position: 'absolute',
    right: 14,
    bottom: 22,
    opacity: 0.2,
  },
});
