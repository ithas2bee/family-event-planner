import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

export default function GroupRequiredScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <MaterialIcons name="groups" size={25} color="#0A91B2" />
          </View>
          <ThemedText type="defaultSemiBold" style={styles.brand}>
            Huddle Up
          </ThemedText>
        </View>

        <View style={styles.illustration}>
          <MaterialIcons name="favorite" size={46} color="#EE82AA" />
          <View style={styles.people}>
            <MaterialIcons name="person" size={104} color="#42C9A0" />
            <MaterialIcons name="person" size={132} color="#0A91B2" />
            <MaterialIcons name="person" size={104} color="#FFB33F" />
          </View>
        </View>

        <ThemedText type="title" style={styles.title}>
          You&apos;re not part{'\n'}of a group yet
        </ThemedText>
        <ThemedText style={styles.description}>
          Huddle Up is built around family groups.{'\n'}Join an existing group or create your own
          to start planning, sharing, and making memories together.
        </ThemedText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to My Groups"
          onPress={() => router.replace('/my-groups')}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <ThemedText type="defaultSemiBold" style={styles.buttonText}>
            Go to My Groups
          </ThemedText>
          <MaterialIcons name="arrow-forward" size={28} color="#FFFFFF" />
        </Pressable>

        <View style={styles.footerRule}>
          <View style={styles.rule} />
          <MaterialIcons name="favorite-border" size={25} color="#EE82AA" />
          <View style={styles.rule} />
        </View>
        <ThemedText type="defaultSemiBold" style={styles.footerTitle}>
          Family. Friends. Moments. Together.
        </ThemedText>
        <ThemedText style={styles.footerText}>That&apos;s what Huddle Up is all about.</ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6FBFF' },
  container: { flexGrow: 1, alignItems: 'center', padding: 28, paddingTop: 38 },
  brandRow: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DDF5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { color: '#102A3D', fontSize: 23 },
  illustration: { alignItems: 'center', marginTop: 72, marginBottom: 24 },
  people: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 15 },
  title: { color: '#102A3D', fontSize: 39, lineHeight: 46, textAlign: 'center' },
  description: {
    color: '#718197',
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    marginTop: 38,
  },
  button: {
    alignSelf: 'stretch',
    minHeight: 66,
    borderRadius: 20,
    backgroundColor: '#0A91B2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 26,
    marginTop: 58,
  },
  pressed: { opacity: 0.8 },
  buttonText: { color: '#FFFFFF', fontSize: 21 },
  footerRule: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 72 },
  rule: { flex: 1, height: 2, backgroundColor: '#D9E4EC' },
  footerTitle: { color: '#718197', fontSize: 17, marginTop: 28 },
  footerText: { color: '#718197', fontSize: 15, marginTop: 6 },
});
