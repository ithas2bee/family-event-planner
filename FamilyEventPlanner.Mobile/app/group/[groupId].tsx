import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { API_BASE_URL } from '@/config/api';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { getGroupMembers, getGroupMemberByUser, type GroupMember } from '@/services/groupMemberService';
import {
  getGroupDetails,
  updateGroupDescription,
  updateGroupAccess,
  updateGroupMemberAdmin,
  type GroupDetails,
  type GroupAccessMode,
} from '@/services/groupDetailsService';
import { loadSession } from '@/services/sessionService';

type AvailableGroup = {
  groupId: string;
  groupName: string;
  memberId: string;
  isAdmin: boolean;
};

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
  const [accessModeDraft, setAccessModeDraft] = useState<GroupAccessMode>('InviteOnlyNotSearchable');
  const [editingDescription, setEditingDescription] = useState(false);
  const [switchGroupOpen, setSwitchGroupOpen] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<AvailableGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [switchGroupError, setSwitchGroupError] = useState<string | null>(null);
  const [switchingGroupId, setSwitchingGroupId] = useState('');
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
      setAccessModeDraft(group.accessMode);
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

  async function toggleGroupList() {
    if (switchGroupOpen) {
      setSwitchGroupOpen(false);
      return;
    }
    setSwitchGroupOpen(true);
    setLoadingGroups(true);
    setSwitchGroupError(null);
    try {
      const session = await loadSession();
      if (!session?.userId) {
        router.replace('/auth');
        return;
      }
      const response = await fetch(`${API_BASE_URL}/api/familygroups/my/${session.userId}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Failed to load your groups (error ${response.status}).`);
      const raw = (await response.json()) as unknown;
      const groups = Array.isArray(raw)
        ? raw.flatMap((item): AvailableGroup[] => {
            if (!item || typeof item !== 'object') return [];
            const entry = item as {
              groupId?: string;
              familyGroupId?: string;
              id?: string;
              groupName?: string;
              name?: string;
              memberId?: string;
              isAdmin?: boolean;
            };
            const availableGroupId = String(entry.groupId ?? entry.familyGroupId ?? entry.id ?? '').trim();
            if (!availableGroupId) return [];
            return [{
              groupId: availableGroupId,
              groupName: String(entry.groupName ?? entry.name ?? '').trim() || 'Unnamed Group',
              memberId: String(entry.memberId ?? ''),
              isAdmin: entry.isAdmin === true,
            }];
          })
        : [];
      setAvailableGroups(groups);
    } catch (loadError) {
      setSwitchGroupError(loadError instanceof Error ? loadError.message : 'Could not load your groups.');
    } finally {
      setLoadingGroups(false);
    }
  }

  async function switchGroup(group: AvailableGroup) {
    if (group.groupId === groupId) return;
    setSwitchingGroupId(group.groupId);
    setSwitchGroupError(null);
    try {
      const session = await loadSession();
      if (!session?.userId) {
        router.replace('/auth');
        return;
      }
      const memberId = group.memberId ||
        (await getGroupMemberByUser(group.groupId, session.userId)).memberId ||
        '';
      if (!memberId) throw new Error('Could not resolve your membership in this group.');
      await setActiveGroup({
        groupId: group.groupId,
        groupName: group.groupName,
        memberId,
        memberName: session.displayName,
      });
      router.replace({
        pathname: '/group/[groupId]',
        params: { groupId: group.groupId, memberId },
      });
    } catch (switchError) {
      setSwitchGroupError(switchError instanceof Error ? switchError.message : 'Could not open this group.');
    } finally {
      setSwitchingGroupId('');
    }
  }

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

  async function saveAccessMode() {
    if (!details) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateGroupAccess(groupId, currentMemberId, accessModeDraft);
      setDetails((current) =>
        current
          ? {
              ...current,
              accessMode: updated.accessMode,
              isInviteOnly: updated.isInviteOnly,
              isSearchable: updated.isSearchable,
            }
          : current,
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update group access.');
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
              <View style={styles.switchHeader}>
                <View style={styles.switchCopy}>
                  <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Your Groups</ThemedText>
                  <ThemedText style={styles.accessText}>Switch to another group you belong to.</ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={switchGroupOpen ? 'Hide groups' : 'Switch Group'}
                  accessibilityState={{ expanded: switchGroupOpen }}
                  onPress={() => void toggleGroupList()}
                  style={styles.secondaryButton}
                >
                  <ThemedText style={styles.secondaryButtonText}>{switchGroupOpen ? 'Close' : 'Switch Group'}</ThemedText>
                </Pressable>
              </View>
              {switchGroupOpen ? (
                <View style={styles.switchGroupList}>
                  {loadingGroups ? <ThemedText style={styles.feedback}>Loading your groups...</ThemedText> : null}
                  {switchGroupError ? <ThemedText accessibilityRole="alert" style={styles.error}>{switchGroupError}</ThemedText> : null}
                  {!loadingGroups && !switchGroupError && availableGroups.map((group) => {
                    const isCurrent = group.groupId === groupId;
                    return (
                      <Pressable
                        key={group.groupId}
                        accessibilityRole="button"
                        accessibilityLabel={isCurrent ? `${group.groupName}, current group` : `Switch to ${group.groupName}`}
                        accessibilityState={{ selected: isCurrent, disabled: isCurrent || switchingGroupId.length > 0 }}
                        disabled={isCurrent || switchingGroupId.length > 0}
                        onPress={() => void switchGroup(group)}
                        style={[styles.switchGroupItem, isCurrent && styles.currentGroupItem]}
                      >
                        <View style={styles.switchGroupCopy}>
                          <ThemedText type="defaultSemiBold" style={styles.value}>{group.groupName}</ThemedText>
                          <ThemedText style={styles.memberRole}>{isCurrent ? 'Current group' : group.isAdmin ? 'Admin' : 'Member'}</ThemedText>
                        </View>
                        {isCurrent ? (
                          <MaterialIcons name="check-circle" size={23} color="#0A9B67" />
                        ) : switchingGroupId === group.groupId ? (
                          <ThemedText style={styles.memberRole}>Opening...</ThemedText>
                        ) : (
                          <MaterialIcons name="chevron-right" size={25} color="#7185A0" />
                        )}
                      </Pressable>
                    );
                  })}
                  {!loadingGroups && !switchGroupError && availableGroups.length === 0 ? (
                    <ThemedText style={styles.feedback}>No other groups are available.</ThemedText>
                  ) : null}
                </View>
              ) : null}
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
              <ThemedText style={styles.adminHint}>Group name and community type are set at creation and can’t be changed.</ThemedText>
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
              {(() => {
                const adminCount = members.filter((entry) => entry.isAdmin).length;
                return members.map((member, index) => {
                  const name = member.displayName?.trim() || 'Unknown member';
                  const isOnlyAdmin = member.isAdmin && adminCount === 1;
                  return (
                    <View key={member.memberId ?? `${name}-${index}`} style={styles.memberRow}>
                      <View style={styles.memberIcon}><ThemedText style={styles.initial}>{name[0]?.toUpperCase() ?? '?'}</ThemedText></View>
                      <View style={styles.memberCopy}>
                        <ThemedText type="defaultSemiBold" style={styles.memberName}>{name}</ThemedText>
                        <ThemedText style={styles.memberRole}>{member.isAdmin ? 'Admin' : 'Member'}</ThemedText>
                      </View>
                      {details.isAdmin && member.memberId ? (
                        isOnlyAdmin ? (
                          <ThemedText style={styles.memberRole}>Only admin</ThemedText>
                        ) : (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`${member.isAdmin ? 'Remove admin' : 'Make admin'} for ${name}`}
                            disabled={saving}
                            onPress={() => void toggleAdmin(member)}
                            style={styles.roleButton}
                          >
                            <ThemedText style={styles.roleButtonText}>{member.isAdmin ? 'Remove admin' : 'Make admin'}</ThemedText>
                          </Pressable>
                        )
                      ) : null}
                    </View>
                  );
                });
              })()}
            </View>

            {details.isAdmin ? (
              <View style={styles.card}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Admin Controls</ThemedText>
                <ThemedText style={styles.accessTitle}>Group Access</ThemedText>
                {[
                  {
                    value: 'InviteOnlyNotSearchable',
                    title: 'Invite Only + Not Searchable',
                    description: 'Members can only join with an invitation.',
                  },
                  {
                    value: 'InviteOnlySearchable',
                    title: 'Invite Only + Searchable',
                    description: 'People can find this group, but need an invitation to join.',
                  },
                  {
                    value: 'CommunitySearchableRequestToJoin',
                    title: 'Community + Searchable + Request to Join',
                    description: 'People can find the group and request to join.',
                  },
                ].map((option) => {
                  const selected = accessModeDraft === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      onPress={() => setAccessModeDraft(option.value as GroupAccessMode)}
                      style={[styles.accessOption, selected && styles.accessOptionSelected]}
                    >
                      <MaterialIcons
                        name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                        size={22}
                        color={selected ? '#087D9F' : '#7185A0'}
                      />
                      <View style={styles.accessOptionCopy}>
                        <ThemedText type="defaultSemiBold" style={styles.value}>{option.title}</ThemedText>
                        <ThemedText style={styles.accessText}>{option.description}</ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
                <Pressable
                  accessibilityRole="button"
                  disabled={saving || accessModeDraft === details.accessMode}
                  onPress={() => void saveAccessMode()}
                  style={[styles.primaryButton, (saving || accessModeDraft === details.accessMode) && styles.disabledButton]}
                >
                  <ThemedText style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save Group Access'}</ThemedText>
                </Pressable>
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
  switchHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchCopy: { flex: 1, gap: 4 },
  switchGroupList: { gap: 8 },
  switchGroupItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#D9E4EC', borderRadius: 13, padding: 12 },
  currentGroupItem: { borderColor: '#91D8C3', backgroundColor: '#F0FAF6' },
  switchGroupCopy: { flex: 1, gap: 3 },
  accessOption: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderColor: '#D9E4EC', borderRadius: 13, padding: 12 },
  accessOptionSelected: { borderColor: '#087D9F', backgroundColor: '#F0FAFC' },
  accessOptionCopy: { flex: 1, gap: 4 },
  accessText: { color: '#52677A', fontSize: 16 },
  adminHint: { color: '#6C7D8E', fontSize: 13, lineHeight: 19, marginTop: 4 },
  disabledButton: { opacity: 0.55 },
});
