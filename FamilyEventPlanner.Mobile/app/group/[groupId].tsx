import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { getGroupMembers, getGroupMemberByUser, type GroupMember } from '@/services/groupMemberService';
import {
  getGroupDetails,
  updateGroupDescription,
  updateGroupMemberAdmin,
  type GroupDetails,
} from '@/services/groupDetailsService';
import { loadSession } from '@/services/sessionService';

export default function GroupDetailsScreen() {
  const params = useLocalSearchParams<{ groupId: string; memberId?: string }>();
  const {
    groupId: contextGroupId,
    groupName: contextGroupName,
    memberId: contextMemberId,
    setActiveGroup,
  } = useActiveGroupContext();
  const groupId = String(params.groupId ?? contextGroupId);
  const [details, setDetails] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!groupId) throw new Error('Group not found.');
      const session = await loadSession();
      if (!session?.userId) {
        router.replace('/auth');
        return;
      }
      const memberId =
        (String(params.memberId ?? '') ||
          (session.groupId === groupId ? session.memberId : '') ||
          (contextGroupId === groupId ? contextMemberId : '')) ||
        (await getGroupMemberByUser(groupId, session.userId)).memberId ||
        '';
      if (!memberId) throw new Error('You are not a member of this group.');

      const [group, groupMembers] = await Promise.all([
        getGroupDetails(groupId, memberId),
        getGroupMembers(groupId, memberId),
      ]);
      setDetails(group);
      setMembers(groupMembers);
      setCurrentMemberId(memberId);
      setDescriptionDraft(group.description ?? '');
      if (
        contextGroupId !== groupId ||
        contextGroupName !== group.groupName ||
        contextMemberId !== memberId
      ) {
        await setActiveGroup({
          groupId,
          groupName: group.groupName,
          memberId,
          memberName: session.displayName,
        });
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load this group.');
    } finally {
      setLoading(false);
    }
  }, [contextGroupId, contextGroupName, contextMemberId, groupId, params.memberId, setActiveGroup]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  async function saveDescription() {
    if (!details) return;
    setSaving(true);
    setError(null);
    try {
      await updateGroupDescription(groupId, currentMemberId, descriptionDraft);
      setEditingDescription(false);
      await loadDetails();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the description.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAdmin(member: GroupMember) {
    if (!member.memberId || !details) return;
    setSaving(true);
    setError(null);
    try {
      await updateGroupMemberAdmin(groupId, member.memberId, currentMemberId, !member.isAdmin);
      await loadDetails();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update the admin role.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" accessibilityLabel="Back to My Groups" onPress={() => router.back()} style={styles.back}>
          <MaterialIcons name="arrow-back" size={24} color="#102A3D" />
          <ThemedText style={styles.backText}>My Groups</ThemedText>
        </Pressable>

        {loading ? <ThemedText style={styles.feedback}>Loading group details...</ThemedText> : null}
        {error ? <ThemedText accessibilityRole="alert" style={styles.error}>{error}</ThemedText> : null}

        {!loading && details ? (
          <>
            <View style={styles.titleRow}>
              <View style={styles.groupIcon}><MaterialIcons name="groups" size={32} color="#087D9F" /></View>
              <View style={styles.titleCopy}>
                <ThemedText type="title" style={styles.title}>{details.groupName}</ThemedText>
                <ThemedText style={styles.subtitle}>
                  {details.isAdmin ? 'Group Management · Admin' : 'Group Details'} · {details.memberCount} member{details.memberCount === 1 ? '' : 's'}
                </ThemedText>
              </View>
            </View>

            <View style={styles.card}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>About this group</ThemedText>
              <View style={styles.infoRow}>
                <ThemedText style={styles.label}>Group name</ThemedText>
                <ThemedText style={styles.value}>{details.groupName}</ThemedText>
              </View>
              <View style={styles.infoRow}>
                <ThemedText style={styles.label}>Community type</ThemedText>
                <ThemedText style={styles.value}>{details.groupType}</ThemedText>
              </View>
              <ThemedText style={styles.label}>Description</ThemedText>
              {editingDescription && details.isAdmin ? (
                <TextInput
                  accessibilityLabel="Group description"
                  multiline
                  maxLength={500}
                  onChangeText={setDescriptionDraft}
                  placeholder="Tell members about this group"
                  style={styles.descriptionInput}
                  value={descriptionDraft}
                />
              ) : (
                <ThemedText style={styles.description}>
                  {details.description?.trim() || 'No description yet.'}
                </ThemedText>
              )}
              {details.isAdmin ? (
                <View style={styles.buttonRow}>
                  {editingDescription ? (
                    <>
                      <Pressable accessibilityRole="button" disabled={saving} onPress={() => void saveDescription()} style={styles.primaryButton}>
                        <ThemedText style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save description'}</ThemedText>
                      </Pressable>
                      <Pressable accessibilityRole="button" onPress={() => { setDescriptionDraft(details.description ?? ''); setEditingDescription(false); }} style={styles.secondaryButton}>
                        <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable accessibilityRole="button" onPress={() => setEditingDescription(true)} style={styles.secondaryButton}>
                      <ThemedText style={styles.secondaryButtonText}>Edit description</ThemedText>
                    </Pressable>
                  )}
                </View>
              ) : null}
            </View>

            <View style={styles.card}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Members · {members.length}</ThemedText>
              {details.isAdmin ? <ThemedText style={styles.accessTitle}>Manage Admins</ThemedText> : null}
              {members.map((member, index) => {
                const name = member.displayName?.trim() || 'Unknown member';
                return (
                  <View key={member.memberId ?? `${name}-${index}`} style={styles.memberRow}>
                    <View style={styles.memberIcon}><ThemedText style={styles.initial}>{name[0]?.toUpperCase() ?? '?'}</ThemedText></View>
                    <View style={styles.memberCopy}>
                      <ThemedText type="defaultSemiBold" style={styles.memberName}>{name}</ThemedText>
                      <ThemedText style={styles.memberRole}>{member.isAdmin ? 'Admin' : 'Member'}</ThemedText>
                    </View>
                    {details.isAdmin && member.memberId ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${member.isAdmin ? 'Remove admin' : 'Make admin'} for ${name}`}
                        disabled={saving}
                        onPress={() => void toggleAdmin(member)}
                        style={styles.roleButton}
                      >
                        <ThemedText style={styles.roleButtonText}>{member.isAdmin ? 'Remove admin' : 'Make admin'}</ThemedText>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>

            {details.isAdmin ? (
              <View style={styles.card}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Admin Controls</ThemedText>
                <ThemedText style={styles.accessTitle}>Group Access</ThemedText>
                <View style={styles.accessRow}>
                  <MaterialIcons name="lock" size={20} color="#087D9F" />
                  <ThemedText style={styles.accessText}>{details.isInviteOnly ? 'Invite Only' : 'Open to join'}</ThemedText>
                </View>
                <View style={styles.accessRow}>
                  <MaterialIcons name={details.isSearchable ? 'search' : 'visibility-off'} size={20} color="#087D9F" />
                  <ThemedText style={styles.accessText}>{details.isSearchable ? 'Searchable' : 'Not Searchable'}</ThemedText>
                </View>
                <ThemedText style={styles.adminHint}>Group name and community type are set at creation and can’t be changed.</ThemedText>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6FBFF' },
  content: { paddingHorizontal: 22, paddingBottom: 36, gap: 14 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8 },
  backText: { color: '#102A3D', fontSize: 16, fontWeight: '600' },
  feedback: { color: '#52677A', paddingVertical: 20 },
  error: { color: '#B13E4B', paddingVertical: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 8 },
  groupIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#DDF5FA', alignItems: 'center', justifyContent: 'center' },
  titleCopy: { flex: 1 },
  title: { color: '#102A3D', fontSize: 30, lineHeight: 38 },
  subtitle: { color: '#52677A', fontSize: 15, marginTop: 3 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, gap: 12, shadowColor: '#66839A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2 },
  sectionTitle: { color: '#102A3D', fontSize: 21, marginBottom: 2 },
  infoRow: { gap: 2 },
  label: { color: '#6C7D8E', fontSize: 14, fontWeight: '600' },
  value: { color: '#102A3D', fontSize: 17, fontWeight: '600' },
  description: { color: '#52677A', fontSize: 16, lineHeight: 23 },
  descriptionInput: { minHeight: 90, borderWidth: 1, borderColor: '#C7D9E4', borderRadius: 12, padding: 12, color: '#102A3D', fontSize: 16, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', gap: 9, flexWrap: 'wrap' },
  primaryButton: { backgroundColor: '#087D9F', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryButton: { alignSelf: 'flex-start', backgroundColor: '#EAF5FF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  secondaryButtonText: { color: '#087D9F', fontWeight: '700' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 6 },
  memberIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#DDF5FA', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#087D9F', fontSize: 18, fontWeight: '700' },
  memberCopy: { flex: 1 },
  memberName: { color: '#102A3D', fontSize: 16 },
  memberRole: { color: '#6C7D8E', fontSize: 13, marginTop: 2 },
  roleButton: { backgroundColor: '#EAF5FF', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  roleButtonText: { color: '#087D9F', fontSize: 12, fontWeight: '700' },
  accessTitle: { color: '#102A3D', fontSize: 16, fontWeight: '700', marginTop: 2 },
  accessRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  accessText: { color: '#52677A', fontSize: 16 },
  adminHint: { color: '#6C7D8E', fontSize: 13, lineHeight: 19, marginTop: 4 },
});
