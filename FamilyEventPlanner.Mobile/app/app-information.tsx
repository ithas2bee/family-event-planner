import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const informationSections = [
  { id: 'about', title: 'About Huddle Up', icon: 'info-outline' },
  { id: 'terms', title: 'Terms of Service', icon: 'description' },
  { id: 'privacy', title: 'Privacy Policy', icon: 'privacy-tip' },
  { id: 'licenses', title: 'Open Source Licenses', icon: 'code' },
] as const;

export default function AppInformationScreen() {
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? 'Unavailable';
  const buildNumber = Constants.nativeBuildVersion ?? 'Unavailable';

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#17345D" />
          </Pressable>
          <View style={styles.headerCopy}>
            <ThemedText style={styles.eyebrow}>ABOUT</ThemedText>
            <ThemedText type="title" style={styles.title}>App Information</ThemedText>
            <ThemedText style={styles.subtitle}>About Huddle Up and app details</ThemedText>
          </View>
        </View>

        <View style={styles.brandCard}>
          <Image source={require('../assets/huddle-up-logo.png')} resizeMode="contain" style={styles.logo} accessibilityLabel="Huddle Up logo" />
          <ThemedText style={styles.brandName}>Huddle Up</ThemedText>
          <ThemedText style={styles.appVersion}>Version {version}</ThemedText>
          <ThemedText style={styles.buildNumber}>Build number {buildNumber}</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>INFORMATION</ThemedText>
          <View style={styles.card}>
            {informationSections.map((section, index) => (
              <Pressable
                key={section.id}
                accessibilityLabel={section.title}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/app-information/[section]', params: { section: section.id } })}
                style={[styles.option, index < informationSections.length - 1 && styles.optionBorder]}
              >
                <View style={styles.iconCircle}>
                  <MaterialIcons name={section.icon} size={21} color="#0A7EA4" />
                </View>
                <ThemedText style={styles.optionTitle}>{section.title}</ThemedText>
                <MaterialIcons name="chevron-right" size={25} color="#8A9AAF" />
              </Pressable>
            ))}
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
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EAF2F6', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 4 },
  eyebrow: { color: '#0A7EA4', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#10264C', fontSize: 32, lineHeight: 36 },
  subtitle: { color: '#71819A', fontSize: 15 },
  brandCard: { alignItems: 'center', borderRadius: 18, backgroundColor: '#FFFFFF', padding: 20, shadowColor: '#17345D', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  logo: { width: 180, height: 98 },
  brandName: { marginTop: 8, color: '#10264C', fontSize: 22, lineHeight: 28, fontWeight: '700' },
  appVersion: { marginTop: 6, color: '#58708B', fontSize: 15, lineHeight: 22 },
  buildNumber: { color: '#71819A', fontSize: 13, lineHeight: 20 },
  section: { gap: 9 },
  sectionTitle: { color: '#58708B', fontSize: 13, fontWeight: '700', letterSpacing: 0.8 },
  card: { overflow: 'hidden', borderRadius: 18, backgroundColor: '#FFFFFF', shadowColor: '#17345D', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  option: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16 },
  optionBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E3EAF0' },
  iconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF5F8' },
  optionTitle: { flex: 1, color: '#17345D', fontSize: 16, fontWeight: '600' },
});
