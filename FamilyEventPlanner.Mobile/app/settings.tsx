import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type SettingOption = {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  route?: '/(tabs)/(main)/my-groups' | '/(tabs)/(main)/members';
};

const sections: { title: string; options: SettingOption[] }[] = [
  {
    title: 'Account',
    options: [
      { title: 'Profile', icon: 'person-outline' },
      { title: 'Privacy', icon: 'lock-outline' },
      { title: 'Notification Preferences', icon: 'notifications-none' },
    ],
  },
  {
    title: 'Family & Groups',
    options: [
      { title: 'Family Group', icon: 'groups', route: '/(tabs)/(main)/my-groups' },
      { title: 'Manage Members', icon: 'group', route: '/(tabs)/(main)/members' },
    ],
  },
  {
    title: 'App Preferences',
    options: [
      { title: 'Appearance', icon: 'palette' },
      { title: 'Language', icon: 'language' },
    ],
  },
  {
    title: 'About',
    options: [{ title: 'App Information', icon: 'info-outline' }],
  },
];

function openOption(option: SettingOption) {
  if (option.route) {
    router.push(option.route);
    return;
  }

  router.push({ pathname: '/under-construction', params: { feature: option.title } });
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#17345D" />
          </Pressable>
          <View style={styles.headerCopy}>
            <ThemedText style={styles.eyebrow}>ACCOUNT</ThemedText>
            <ThemedText type="title" style={styles.title}>Settings</ThemedText>
            <ThemedText style={styles.subtitle}>Manage your app experience</ThemedText>
          </View>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
            <View style={styles.card}>
              {section.options.map((option, index) => (
                <Pressable
                  key={option.title}
                  accessibilityLabel={option.title}
                  accessibilityRole="button"
                  onPress={() => openOption(option)}
                  style={[styles.option, index < section.options.length - 1 && styles.optionBorder]}
                >
                  <View style={styles.iconCircle}>
                    <MaterialIcons name={option.icon} size={21} color="#0A7EA4" />
                  </View>
                  <ThemedText style={styles.optionTitle}>{option.title}</ThemedText>
                  <MaterialIcons name="chevron-right" size={25} color="#8A9AAF" />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBFD' },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 22 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EAF2F6', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 4 },
  eyebrow: { color: '#0A7EA4', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#10264C', fontSize: 32, lineHeight: 36 },
  subtitle: { color: '#71819A', fontSize: 15 },
  section: { gap: 9 },
  sectionTitle: { color: '#58708B', fontSize: 13, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  card: { overflow: 'hidden', borderRadius: 18, backgroundColor: '#FFFFFF', shadowColor: '#17345D', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  option: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16 },
  optionBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E3EAF0' },
  iconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF5F8' },
  optionTitle: { flex: 1, color: '#17345D', fontSize: 16, fontWeight: '600' },
});
