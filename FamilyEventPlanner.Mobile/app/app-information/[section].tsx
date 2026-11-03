import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import packageLock from '../../package-lock.json';

const sections = {
  about: {
    title: 'About Huddle Up',
    content: 'Huddle Up brings communities together.',
  },
  terms: {
    title: 'Terms of Service',
    content: 'Terms of Service are not available in the app yet.',
  },
  privacy: {
    title: 'Privacy Policy',
    content: 'The Privacy Policy is not available in the app yet.',
  },
} as const;

type LockedPackage = { version?: string; license?: string; dev?: boolean };

const licenses = Object.entries(packageLock.packages as Record<string, LockedPackage>)
  .filter(([path, dependency]) => path.includes('node_modules/') && dependency.license && !dependency.dev)
  .map(([path, dependency]) => ({
    name: path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length),
    version: dependency.version ?? 'Unknown',
    license: dependency.license!,
  }))
  .sort((left, right) => left.name.localeCompare(right.name) || left.version.localeCompare(right.version));

export default function AppInformationDetailScreen() {
  const insets = useSafeAreaInsets();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const detail = section && section in sections ? sections[section as keyof typeof sections] : undefined;
  const title = section === 'licenses' ? 'Open Source Licenses' : detail?.title ?? 'App Information';

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#17345D" />
        </Pressable>
        <ThemedText type="title" style={styles.title}>{title}</ThemedText>
      </View>
      {section === 'licenses' ? (
        <FlatList
          data={licenses}
          keyExtractor={(item) => `${item.name}@${item.version}`}
          contentContainerStyle={styles.licenseContent}
          ListHeaderComponent={(
            <ThemedText style={styles.note}>
              License names are shown for production dependencies in the app&apos;s package lockfile. Full license text is not bundled here.
            </ThemedText>
          )}
          renderItem={({ item }) => (
            <View style={styles.licenseRow}>
              <ThemedText style={styles.packageName}>{item.name}</ThemedText>
              <ThemedText style={styles.packageMeta}>Version {item.version} · {item.license}</ThemedText>
            </View>
          )}
        />
      ) : (
        <View style={styles.detailCard}>
          <ThemedText style={styles.body}>{detail?.content ?? 'This information is not available in the app yet.'}</ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBFD' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EAF2F6', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#10264C', fontSize: 26, lineHeight: 32 },
  detailCard: { marginHorizontal: 20, borderRadius: 18, backgroundColor: '#FFFFFF', padding: 20, shadowColor: '#17345D', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  body: { color: '#58708B', fontSize: 16, lineHeight: 24 },
  licenseContent: { paddingHorizontal: 20, paddingBottom: 32 },
  note: { marginBottom: 12, color: '#71819A', fontSize: 14, lineHeight: 21 },
  licenseRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E3EAF0', paddingVertical: 12 },
  packageName: { color: '#17345D', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  packageMeta: { marginTop: 2, color: '#71819A', fontSize: 13, lineHeight: 19 },
});
