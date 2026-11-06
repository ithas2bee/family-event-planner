import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CommunitySelector } from '@/components/community-selector';
import { ThemedText } from '@/components/themed-text';
import { getCommunityMemberProfile, getProfile, type MemberProfile, type Profile } from '@/services/profileService';

function initials(name: string | null) {
  return (name ?? 'You')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export default function ProfileScreen() {
  const params = useLocalSearchParams<{ groupId?: string; memberId?: string }>();
  const groupId = String(params.groupId ?? '');
  const memberId = String(params.memberId ?? '');
  const viewingMember = Boolean(groupId && memberId);
  const [profile, setProfile] = useState<Profile | MemberProfile | null>(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setError('');
    const request = viewingMember
      ? getCommunityMemberProfile(groupId, memberId)
      : getProfile();
    request
      .then((value) => active && setProfile(value))
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : 'Unable to load this profile.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [groupId, memberId, viewingMember]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#1769E0" /></View>;
  }

  if (!profile) {
    return <View style={styles.center}><ThemedText style={styles.error}>{error || 'Unable to load your profile.'}</ThemedText></View>;
  }

  const displayName = profile.name || (viewingMember ? 'Community member' : 'Your profile');
  const canEdit = !viewingMember || ('isOwnProfile' in profile && profile.isOwnProfile);
  const selectedCommunity = profile.communities.find((community) => community.groupId === selectedCommunityId)
    ?? profile.communities[0];
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.navigation}>
        <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.navAction}>
          <Ionicons name="chevron-back" size={24} color="#1769E0" />
          <ThemedText style={styles.navText}>Back</ThemedText>
        </Pressable>
        <ThemedText style={styles.heading}>{canEdit ? 'My Profile' : 'Member Profile'}</ThemedText>
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
        <InfoRow icon="calendar-outline" label="Age" value={profile.age !== null ? String(profile.age) : 'Not provided'} />
        <InfoRow icon="location-outline" label="Location" value={profile.location || 'Not provided'} />
        <InfoRow
          icon="people-outline"
          label="Communities"
          value={`${profile.communities.length} ${profile.communities.length === 1 ? 'community' : 'communities'}`}
        />
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Bio</ThemedText>
        <ThemedText style={styles.bio}>{profile.bio || (viewingMember ? 'No bio provided.' : 'Tell your community a little about yourself.')}</ThemedText>
      </View>

      {profile.communities.length > 0 && (
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Community roles</ThemedText>
          <CommunitySelector
            communities={profile.communities.map((community) => ({ id: community.groupId, name: community.communityName }))}
            selectedCommunityId={selectedCommunity?.groupId ?? ''}
            onSelect={setSelectedCommunityId}
          />
          {selectedCommunity && <ThemedText style={styles.communityName}>{selectedCommunity.communityName}</ThemedText>}
          {selectedCommunity && selectedCommunity.roles.length > 0 ? selectedCommunity.roles.map((role) => (
            <ThemedText key={role} style={styles.role}>{role}</ThemedText>
          )) : <ThemedText style={styles.bio}>No roles selected.</ThemedText>}
        </View>
      )}

      {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}
      {canEdit && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/edit-profile')} style={styles.editButton}>
          <Ionicons name="create-outline" size={22} color="#fff" />
          <ThemedText style={styles.editText}>Edit Profile</ThemedText>
        </Pressable>
      )}
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return <View style={styles.infoRow}><Ionicons name={icon} size={22} color="#1769E0" /><ThemedText style={styles.label}>{label}</ThemedText><ThemedText style={styles.value}>{value}</ThemedText></View>;
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
  avatarText: { fontSize: 44, lineHeight: 53, fontWeight: '700', color: '#1769E0' },
  name: { marginTop: 16, fontSize: 30, lineHeight: 36, fontWeight: '700', color: '#101B41' },
  card: { marginHorizontal: 18, marginBottom: 18, padding: 18, borderRadius: 16, backgroundColor: '#fff', shadowColor: '#203A72', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  infoRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#EEF1F7', paddingVertical: 7 },
  label: { color: '#53627F', fontSize: 16, width: 72 },
  value: { flex: 1, color: '#101B41', fontSize: 16 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#101B41', marginBottom: 8 },
  communityName: { color: '#17345D', fontSize: 16, fontWeight: '700', marginTop: 14 },
  bio: { color: '#293657', fontSize: 16, lineHeight: 24 },
  role: { color: '#293657', fontSize: 16, lineHeight: 24, paddingVertical: 2 },
  editButton: { marginHorizontal: 18, minHeight: 58, borderRadius: 14, backgroundColor: '#2877E8', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  editText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  error: { color: '#B42318', textAlign: 'center', margin: 16 },
});
