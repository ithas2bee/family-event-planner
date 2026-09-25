import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getProfile, PROFILE_ROLES, updateProfile, type Profile } from '@/services/profileService';

export default function EditProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [bio, setBio] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile().then((value) => {
      setProfile(value);
      setName(value.name ?? '');
      setAge(value.age?.toString() ?? '');
      setLocation(value.location ?? '');
      setPhotoUrl(value.profilePictureUrl ?? '');
      setBio(value.bio ?? '');
      setRoles(value.roles);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load your profile.'));
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await updateProfile({
        name: name.trim() || null,
        age: age.trim() ? Number(age) : null,
        location: location.trim() || null,
        bio: bio.trim() || null,
        profilePictureUrl: photoUrl.trim() || null,
        roles,
      });
      router.back();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return <View style={styles.center}>{error ? <ThemedText style={styles.error}>{error}</ThemedText> : <ActivityIndicator color="#1769E0" />}</View>;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.navigation}>
        <Pressable accessibilityLabel="Cancel editing" onPress={() => router.back()}><ThemedText style={styles.action}>Cancel</ThemedText></Pressable>
        <ThemedText style={styles.heading}>Edit Profile</ThemedText>
        <Pressable accessibilityLabel="Save profile" disabled={saving} onPress={save}><ThemedText style={styles.action}>{saving ? 'Saving' : 'Save'}</ThemedText></Pressable>
      </View>
      <View style={styles.photoSection}>
        {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Ionicons name="person" size={52} color="#1769E0" /></View>}
        <ThemedText style={styles.photoHint}>Profile photo URL</ThemedText>
        <TextInput value={photoUrl} onChangeText={setPhotoUrl} placeholder="https://..." placeholderTextColor="#8A96AA" style={styles.input} autoCapitalize="none" />
      </View>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
      <Field label="Age" value={age} onChangeText={setAge} placeholder="Your age" keyboardType="number-pad" />
      <Field label="Location" value={location} onChangeText={setLocation} placeholder="City, State" />
      <ThemedText style={styles.label}>Roles</ThemedText>
      <View style={styles.roleList}>{PROFILE_ROLES.map((role) => {
        const selected = roles.includes(role);
        return <Pressable key={role} onPress={() => setRoles((current) => selected ? current.filter((item) => item !== role) : [...current, role])} style={[styles.role, selected && styles.selectedRole]}><ThemedText style={[styles.roleText, selected && styles.selectedRoleText]}>{role}</ThemedText>{selected && <Ionicons name="checkmark" size={17} color="#1769E0" />}</Pressable>;
      })}</View>
      <ThemedText style={styles.label}>Bio</ThemedText>
      <TextInput value={bio} onChangeText={setBio} placeholder="Tell your family a little about yourself." placeholderTextColor="#8A96AA" style={[styles.input, styles.bioInput]} multiline />
      {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}
    </ScrollView>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View><ThemedText style={styles.label}>{label}</ThemedText><TextInput {...props} style={styles.input} placeholderTextColor="#8A96AA" /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFE' },
  content: { paddingBottom: 36, paddingHorizontal: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  navigation: { minHeight: 92, paddingTop: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: -18, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#E7ECF5', backgroundColor: '#fff' },
  heading: { fontSize: 20, fontWeight: '700', color: '#101B41' },
  action: { color: '#1769E0', fontSize: 17 },
  photoSection: { alignItems: 'center', paddingVertical: 18 },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarFallback: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#DDEAFF', alignItems: 'center', justifyContent: 'center' },
  photoHint: { color: '#1769E0', fontWeight: '600', marginTop: 10 },
  label: { color: '#101B41', fontSize: 16, fontWeight: '600', marginTop: 14, marginBottom: 7 },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#CDD5E3', borderRadius: 11, backgroundColor: '#fff', paddingHorizontal: 14, color: '#101B41', fontSize: 16 },
  bioInput: { minHeight: 110, paddingTop: 12, textAlignVertical: 'top' },
  roleList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  role: { borderWidth: 1, borderColor: '#CDD5E3', borderRadius: 18, backgroundColor: '#fff', paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', gap: 5, alignItems: 'center' },
  selectedRole: { borderColor: '#1769E0', backgroundColor: '#E0ECFF' },
  roleText: { color: '#53627F' },
  selectedRoleText: { color: '#1769E0', fontWeight: '600' },
  error: { color: '#B42318', textAlign: 'center', marginTop: 16 },
});
