import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getProfile, type Profile } from '@/services/profileService';

function initials(name: string | null) {
  return (name ?? 'You')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    getProfile()
      .then((value) => active && setProfile(value))
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : 'Unable to load your profile.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#1769E0" /></View>;
  }

  if (!profile) {
    return <View style={styles.center}><ThemedText style={styles.error}>{error || 'Unable to load your profile.'}</ThemedText></View>;
  }

  const displayName = profile.name || 'Your profile';
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.navigation}>
        <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.navAction}>
          <Ionicons name="chevron-back" size={24} color="#1769E0" />
          <ThemedText style={styles.navText}>Back</ThemedText>
        </Pressable>
        <ThemedText style={styles.heading}>My Profile</ThemedText>
        <View style={styles.navSpacer} />
      </View>

      <View style={styles.hero}>
        {profile.profilePictureUrl ? (
          <Image source={{ uri: profile.profilePictureUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}><ThemedText style={styles.avatarText}>{initials(profile.name)}</ThemedText></View>
        )}
        <ThemedText style={styles.name}>{displayName}</ThemedText>
      </View>

      <View style={styles.card}>
        <InfoRow icon="calendar-outline" label="Age" value={profile.age ? String(profile.age) : 'Not provided'} />
        <InfoRow icon="location-outline" label="Location" value={profile.location || 'Not provided'} />
        {profile.familyNames.length > 0 && <InfoRow icon="people-outline" label="Family" value={profile.familyNames.join(', ')} />}
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={22} color="#1769E0" />
          <ThemedText style={styles.label}>Roles</ThemedText>
          <View style={styles.chips}>{profile.roles.length > 0 ? profile.roles.map((role) => <Chip key={role} label={role} />) : <ThemedText style={styles.value}>Not provided</ThemedText>}</View>
        </View>
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Bio</ThemedText>
        <ThemedText style={styles.bio}>{profile.bio || 'Tell your family a little about yourself.'}</ThemedText>
      </View>

      {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}
      <Pressable accessibilityRole="button" onPress={() => router.push('/edit-profile')} style={styles.editButton}>
        <Ionicons name="create-outline" size={22} color="#fff" />
        <ThemedText style={styles.editText}>Edit Profile</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return <View style={styles.infoRow}><Ionicons name={icon} size={22} color="#1769E0" /><ThemedText style={styles.label}>{label}</ThemedText><ThemedText style={styles.value}>{value}</ThemedText></View>;
}

function Chip({ label, selected = true, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return <Pressable onPress={onPress} style={[styles.chip, selected && styles.selectedChip]}><ThemedText style={[styles.chipText, selected && styles.selectedChipText]}>{label}</ThemedText></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFE' },
  content: { paddingBottom: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  navigation: { minHeight: 92, paddingTop: 48, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E7ECF5', backgroundColor: '#fff' },
  navAction: { flexDirection: 'row', alignItems: 'center', width: 90 },
  navText: { color: '#1769E0', fontSize: 17 },
  navSpacer: { width: 90 },
  heading: { fontSize: 20, fontWeight: '700', color: '#101B41' },
  hero: { alignItems: 'center', paddingVertical: 28 },
  avatar: { width: 148, height: 148, borderRadius: 74 },
  avatarFallback: { width: 148, height: 148, borderRadius: 74, backgroundColor: '#DDEAFF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 44, fontWeight: '700', color: '#1769E0' },
  name: { marginTop: 16, fontSize: 30, lineHeight: 36, fontWeight: '700', color: '#101B41' },
  card: { marginHorizontal: 18, marginBottom: 18, padding: 18, borderRadius: 16, backgroundColor: '#fff', shadowColor: '#203A72', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  infoRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#EEF1F7', paddingVertical: 7 },
  label: { color: '#53627F', fontSize: 16, width: 72 },
  value: { flex: 1, color: '#101B41', fontSize: 16 },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F0F3F8' },
  selectedChip: { backgroundColor: '#E0ECFF' },
  chipText: { color: '#53627F', fontSize: 14 },
  selectedChipText: { color: '#1769E0', fontWeight: '600' },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#101B41', marginBottom: 8 },
  bio: { color: '#293657', fontSize: 16, lineHeight: 24 },
  editButton: { marginHorizontal: 18, minHeight: 58, borderRadius: 14, backgroundColor: '#2877E8', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  editText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  error: { color: '#B42318', textAlign: 'center', margin: 16 },
});

export { Chip };
