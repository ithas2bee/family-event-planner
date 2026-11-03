import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const privacyInformation = [
  {
    icon: 'person-outline',
    title: 'Your profile',
    description:
      'Your profile details are managed from Profile. Group members can see your display name in their member list. The app does not currently offer controls to hide individual profile details.',
  },
  {
    icon: 'groups',
    title: 'Groups and discoverability',
    description:
      'Group access is set separately for each group by its Admins. Only groups marked searchable appear in group search. Invite-only groups still require an invitation, while eligible community groups can accept join requests.',
  },
  {
    icon: 'event',
    title: 'Group content',
    description:
      'Group events and member information are accessed through group membership. Your account privacy settings do not change who can access a group or its content.',
  },
] as const;

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#17345D" />
          </Pressable>
          <View style={styles.headerCopy}>
            <ThemedText style={styles.eyebrow}>ACCOUNT</ThemedText>
            <ThemedText type="title" style={styles.title}>Privacy</ThemedText>
            <ThemedText style={styles.subtitle}>
              Understand what is visible and where access is managed.
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>HOW YOUR INFORMATION IS USED</ThemedText>
          <View style={styles.card}>
            {privacyInformation.map((item, index) => (
              <View
                key={item.title}
                style={[styles.option, index < privacyInformation.length - 1 && styles.optionBorder]}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name={item.icon} size={21} color="#0A7EA4" />
                </View>
                <View style={styles.optionCopy}>
                  <ThemedText style={styles.optionTitle}>{item.title}</ThemedText>
                  <ThemedText style={styles.description}>{item.description}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.notice}>
          <MaterialIcons name="info-outline" size={22} color="#0A7EA4" />
          <View style={styles.noticeCopy}>
            <ThemedText style={styles.optionTitle}>What you can manage</ThemedText>
            <ThemedText style={styles.description}>
              Huddle Up does not currently provide account-level privacy switches. Update your
              profile from Profile, or ask a group Admin about that group’s access settings.
              Notification Preferences are managed separately in Settings.
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBFD' },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 22 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, gap: 4 },
  eyebrow: { color: '#0A7EA4', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#10264C', fontSize: 32, lineHeight: 36 },
  subtitle: { color: '#71819A', fontSize: 15, lineHeight: 21 },
  section: { gap: 9 },
  sectionTitle: { color: '#58708B', fontSize: 13, fontWeight: '700', letterSpacing: 0.8 },
  card: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#17345D',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  option: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16 },
  optionBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E3EAF0' },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF5F8',
  },
  optionCopy: { flex: 1, gap: 4 },
  optionTitle: { color: '#17345D', fontSize: 16, fontWeight: '600' },
  description: { color: '#71819A', fontSize: 13, lineHeight: 19 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#EAF5F8',
  },
  noticeCopy: { flex: 1, gap: 4 },
});
