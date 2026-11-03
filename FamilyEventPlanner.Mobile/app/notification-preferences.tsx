import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  loadNotificationPreferences,
  NOTIFICATION_PREFERENCE_CATEGORIES,
  saveNotificationPreferences,
} from '@/services/notificationPreferencesService';
import type { NotificationPreferences } from '@/services/notificationPreferencesService';

export default function NotificationPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadNotificationPreferences()
      .then((loadedPreferences) => {
        if (!cancelled) {
          setPreferences(loadedPreferences);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Preferences could not be loaded. You can still update them below.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function updatePreference(category: keyof NotificationPreferences, enabled: boolean) {
    const previousPreferences = preferences;
    const updatedPreferences = { ...previousPreferences, [category]: enabled };
    setPreferences(updatedPreferences);
    setSaving(true);
    setError(null);

    try {
      await saveNotificationPreferences(updatedPreferences);
    } catch {
      setPreferences(previousPreferences);
      setError('Your preference could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

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
            <ThemedText type="title" style={styles.title}>Notification Preferences</ThemedText>
            <ThemedText style={styles.subtitle}>
              Choose which community updates appear in Notifications.
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>IN-APP NOTIFICATIONS</ThemedText>
          <View style={styles.card}>
            {NOTIFICATION_PREFERENCE_CATEGORIES.map((category, index) => (
              <View
                key={category.key}
                style={[
                  styles.option,
                  index < NOTIFICATION_PREFERENCE_CATEGORIES.length - 1 && styles.optionBorder,
                ]}>
                <View style={styles.optionCopy}>
                  <ThemedText style={styles.optionTitle}>{category.title}</ThemedText>
                  <ThemedText style={styles.description}>{category.description}</ThemedText>
                </View>
                <Switch
                  accessibilityLabel={`${category.title} notifications`}
                  accessibilityState={{
                    checked: preferences[category.key],
                    disabled: loading || saving,
                  }}
                  disabled={loading || saving}
                  onValueChange={(enabled) => void updatePreference(category.key, enabled)}
                  trackColor={{ false: '#CBD5E1', true: '#8BCBD8' }}
                  thumbColor={preferences[category.key] ? '#0A7EA4' : '#F8FAFC'}
                  value={preferences[category.key]}
                />
              </View>
            ))}
          </View>
        </View>

        {loading && <ThemedText style={styles.status}>Loading your preferences...</ThemedText>}
        {saving && <ThemedText style={styles.status}>Saving your preference...</ThemedText>}
        {error !== null && <ThemedText style={styles.error}>{error}</ThemedText>}
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
  subtitle: { color: '#71819A', fontSize: 15 },
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
  option: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  optionBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E3EAF0' },
  optionCopy: { flex: 1, gap: 3 },
  optionTitle: { color: '#17345D', fontSize: 16, fontWeight: '600' },
  description: { color: '#71819A', fontSize: 13, lineHeight: 18 },
  status: { color: '#58708B', fontSize: 14 },
  error: { color: '#B42318', fontSize: 14 },
});
