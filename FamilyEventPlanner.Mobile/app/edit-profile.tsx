import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getProfile, updateProfile, type Profile } from '@/services/profileService';

export default function EditProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile().then((value) => {
      setProfile(value);
      setName(value.name ?? '');
      setAge(value.age?.toString() ?? '');
      setLocation(value.location ?? '');
      setBio(value.bio ?? '');
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load your profile.'));
  }, []);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setError('');
    try {
      await updateProfile({
        name: name.trim() || null,
        age: age.trim() ? Number(age) : null,
        location: location.trim() || null,
        bio: bio.trim() || null,
        profilePictureUrl: profile.profilePictureUrl,
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
        {profile.profilePictureUrl ? <Image source={{ uri: profile.profilePictureUrl }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Ionicons name="person" size={52} color="#1769E0" /></View>}
      </View>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
      <Field label="Age" value={age} onChangeText={setAge} placeholder="Your age" keyboardType="number-pad" />
      <Field label="Location" value={location} onChangeText={setLocation} placeholder="City, State" />
      <ThemedText style={styles.label}>Bio</ThemedText>
      <TextInput value={bio} onChangeText={setBio} placeholder="Tell your community a little about yourself." placeholderTextColor="#8A96AA" style={[styles.input, styles.bioInput]} multiline />
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
  label: { color: '#101B41', fontSize: 16, fontWeight: '600', marginTop: 14, marginBottom: 7 },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#CDD5E3', borderRadius: 11, backgroundColor: '#fff', paddingHorizontal: 14, color: '#101B41', fontSize: 16 },
  bioInput: { minHeight: 110, paddingTop: 12, textAlignVertical: 'top' },
  error: { color: '#B42318', textAlign: 'center', marginTop: 16 },
});
