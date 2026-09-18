import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const sections = [
  {
    title: 'Quick Help',
    options: [
      { title: 'FAQs', icon: 'quiz' as const },
      { title: 'How-To Guides', icon: 'menu-book' as const },
      { title: 'Tips & Best Practices', icon: 'lightbulb-outline' as const },
    ],
  },
  {
    title: 'Contact Support',
    options: [
      { title: 'Email Support', icon: 'email' as const },
      { title: 'Send Feedback', icon: 'feedback' as const },
    ],
  },
];

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#17345D" />
          </Pressable>
          <View style={styles.headerCopy}>
            <ThemedText style={styles.eyebrow}>SUPPORT</ThemedText>
            <ThemedText type="title" style={styles.title}>Help & Support</ThemedText>
            <ThemedText style={styles.subtitle}>Find answers and get assistance</ThemedText>
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
                  onPress={() => router.push({ pathname: '/under-construction', params: { feature: option.title } })}
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
  title: { color: '#10264C', fontSize: 30, lineHeight: 36 },
  subtitle: { color: '#71819A', fontSize: 15 },
  section: { gap: 9 },
  sectionTitle: { color: '#58708B', fontSize: 13, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  card: { overflow: 'hidden', borderRadius: 18, backgroundColor: '#FFFFFF', shadowColor: '#17345D', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  option: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16 },
  optionBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E3EAF0' },
  iconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF5F8' },
  optionTitle: { flex: 1, color: '#17345D', fontSize: 16, fontWeight: '600' },
});
