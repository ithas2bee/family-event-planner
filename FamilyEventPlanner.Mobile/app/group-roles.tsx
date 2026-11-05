import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import {
  createCommunityRole,
  deactivateCommunityRole,
  getCommunityRoles,
  getGroupDetails,
  restoreCommunityRoleDefaults,
  updateCommunityRole,
  updateGroupMemberRole,
  type CommunityRole,
  type GroupDetails,
} from '@/services/groupDetailsService';
import { getGroupMembers } from '@/services/groupMemberService';

export default function GroupRolesScreen() {
  const params = useLocalSearchParams<{ groupId?: string; memberId?: string }>();
  const { groupId: activeGroupId, memberId: activeMemberId } = useActiveGroupContext();
  const groupId = String(params.groupId ?? activeGroupId ?? '');
  const memberId = String(params.memberId ?? activeMemberId ?? '');
  const [details, setDetails] = useState<GroupDetails | null>(null);
  const [roles, setRoles] = useState<CommunityRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const customRoleCount = roles.filter((role) => !role.isDefault).length;
  const customRoleLimitReached = customRoleCount >= 4;

  const loadRoles = useCallback(async () => {
    await Promise.resolve();
    if (!groupId || !memberId) {
      setError('Community not found.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [group, availableRoles, members] = await Promise.all([
        getGroupDetails(groupId, memberId),
        getCommunityRoles(groupId),
        getGroupMembers(groupId, memberId),
      ]);
      const currentMember = members.find((item) => item.memberId === memberId);
      setDetails(group);
      setRoles(availableRoles);
      setSelectedRoleId(currentMember?.roleId ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load community roles.');
    } finally {
      setLoading(false);
    }
  }, [groupId, memberId]);

  useEffect(() => {
    void Promise.resolve().then(loadRoles);
  }, [loadRoles]);

  async function selectRole(roleId: string | null) {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateGroupMemberRole(groupId, memberId, roleId);
      setSelectedRoleId(roleId);
      setMessage('Your community role was updated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update your role.');
    } finally {
      setSaving(false);
    }
  }

  async function saveRole() {
    const name = roleName.trim();
    if (!name) {
      setError('Enter a role name.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (editingRoleId) {
        await updateCommunityRole(groupId, editingRoleId, name);
      } else {
        await createCommunityRole(groupId, name);
      }
      setRoleName('');
      setEditingRoleId(null);
      setMessage('Community roles were updated.');
      await loadRoles();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save this role.');
    } finally {
      setSaving(false);
    }
  }

  function removeRole(role: CommunityRole) {
    Alert.alert('Remove role?', `Members will no longer be able to select ${role.name}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setSaving(true);
          setError('');
          void deactivateCommunityRole(groupId, role.id)
            .then(async () => {
              if (selectedRoleId === role.id) setSelectedRoleId(null);
              setMessage('Role removed.');
              await loadRoles();
            })
            .catch((reason: unknown) =>
              setError(reason instanceof Error ? reason.message : 'Unable to remove this role.'),
            )
            .finally(() => setSaving(false));
        },
      },
    ]);
  }

  async function restoreDefaults() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await restoreCommunityRoleDefaults(groupId);
      setMessage('Default roles were restored.');
      await loadRoles();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to restore default roles.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back-ios" size={22} color="#405675" />
          </Pressable>
          <View style={styles.heading}>
            <ThemedText type="title" style={styles.title}>Community Roles</ThemedText>
            <ThemedText style={styles.subtitle}>{details?.groupName ?? 'Manage your role in this community'}</ThemedText>
          </View>
        </View>

        {loading ? <ActivityIndicator color="#1769E0" style={styles.loader} /> : null}
        {!loading && error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
        {!loading && !error && details ? (
          <>
            <View style={styles.card}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Choose your role</ThemedText>
              {roles.length === 0 ? (
                <ThemedText style={styles.feedback}>No roles are available in this community yet.</ThemedText>
              ) : (
                <View style={styles.roleList}>
                  {roles.map((role) => {
                    const selected = selectedRoleId === role.id;
                    return (
                      <Pressable
                        key={role.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        disabled={saving}
                        onPress={() => void selectRole(role.id)}
                        style={[styles.roleOption, selected && styles.selectedRole]}
                      >
                        <ThemedText style={[styles.roleText, selected && styles.selectedRoleText]}>{role.name}</ThemedText>
                        {selected ? <MaterialIcons name="check" size={18} color="#1769E0" /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              )}
              {selectedRoleId ? (
                <Pressable accessibilityRole="button" disabled={saving} onPress={() => void selectRole(null)} style={styles.clearButton}>
                  <ThemedText style={styles.clearText}>Clear my role</ThemedText>
                </Pressable>
              ) : null}
            </View>

            {details.isAdmin ? (
              <View style={styles.card}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Manage available roles</ThemedText>
                <ThemedText style={styles.feedback}>Changes apply only to {details.groupName}.</ThemedText>
                <ThemedText style={styles.feedback}>Custom roles: {customRoleCount} of 4</ThemedText>
                {customRoleLimitReached && !editingRoleId ? (
                  <ThemedText style={styles.feedback}>The four custom-role limit has been reached. Remove a custom role before adding another.</ThemedText>
                ) : null}
                <TextInput
                  accessibilityLabel="Role name"
                  maxLength={50}
                  onChangeText={setRoleName}
                  placeholder="Add a role"
                  placeholderTextColor="#8A96AA"
                  style={styles.input}
                  value={roleName}
                />
                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving || (!editingRoleId && customRoleLimitReached)}
                    onPress={() => void saveRole()}
                    style={[styles.primaryButton, (!editingRoleId && customRoleLimitReached) && styles.disabledButton]}
                  >
                    <ThemedText style={styles.primaryButtonText}>{editingRoleId ? 'Save role' : 'Add role'}</ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving}
                    onPress={() => {
                      setRoleName('');
                      setEditingRoleId(null);
                    }}
                    style={styles.secondaryButton}
                  >
                    <ThemedText style={styles.secondaryButtonText}>Cancel</ThemedText>
                  </Pressable>
                </View>
                {roles.map((role) => (
                  <View key={role.id} style={styles.manageRow}>
                    <View style={styles.roleCopy}>
                      <ThemedText type="defaultSemiBold" style={styles.roleText}>{role.name}</ThemedText>
                      {role.isDefault ? <ThemedText style={styles.defaultLabel}>Default</ThemedText> : null}
                    </View>
                    {!role.isDefault ? (
                      <>
                        <Pressable
                          accessibilityLabel={`Edit ${role.name}`}
                          disabled={saving}
                          onPress={() => {
                            setEditingRoleId(role.id);
                            setRoleName(role.name);
                          }}
                          style={styles.iconButton}
                        >
                          <MaterialIcons name="edit" size={20} color="#1769E0" />
                        </Pressable>
                        <Pressable
                          accessibilityLabel={`Remove ${role.name}`}
                          disabled={saving}
                          onPress={() => removeRole(role)}
                          style={styles.iconButton}
                        >
                          <MaterialIcons name="delete-outline" size={21} color="#B42318" />
                        </Pressable>
                      </>
                    ) : null}
                  </View>
                ))}
                <Pressable accessibilityRole="button" disabled={saving} onPress={() => void restoreDefaults()} style={styles.restoreButton}>
                  <ThemedText style={styles.restoreText}>Restore default roles</ThemedText>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}
        {!!message ? <ThemedText style={styles.success}>{message}</ThemedText> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F8FC' },
  content: { padding: 20, paddingBottom: 36, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  backButton: { padding: 8 },
  heading: { flex: 1 },
  title: { color: '#102A65', fontSize: 28, lineHeight: 34 },
  subtitle: { color: '#687A96', fontSize: 15, lineHeight: 21, marginTop: 4 },
  loader: { marginTop: 32 },
  card: { gap: 12, padding: 18, borderRadius: 18, backgroundColor: '#FFFFFF' },
  sectionTitle: { color: '#102A65', fontSize: 20 },
  feedback: { color: '#687A96', fontSize: 14, lineHeight: 20 },
  roleList: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  roleOption: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#CDD5E3', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9 },
  selectedRole: { borderColor: '#1769E0', backgroundColor: '#E0ECFF' },
  roleText: { color: '#293657', fontSize: 15 },
  selectedRoleText: { color: '#1769E0', fontWeight: '600' },
  clearButton: { alignSelf: 'flex-start', paddingVertical: 6 },
  clearText: { color: '#1769E0', fontSize: 14, fontWeight: '600' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#CDD5E3', borderRadius: 11, backgroundColor: '#FFFFFF', paddingHorizontal: 13, color: '#101B41', fontSize: 16 },
  actionRow: { flexDirection: 'row', gap: 10 },
  primaryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 11, backgroundColor: '#1769E0' },
  disabledButton: { opacity: 0.45 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 11, backgroundColor: '#EEF2F8' },
  secondaryButtonText: { color: '#405675', fontWeight: '600' },
  manageRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEF1F7', paddingTop: 10 },
  roleCopy: { flex: 1, gap: 2 },
  defaultLabel: { color: '#7185A0', fontSize: 12 },
  iconButton: { padding: 9 },
  restoreButton: { alignSelf: 'flex-start', paddingVertical: 7 },
  restoreText: { color: '#1769E0', fontWeight: '600' },
  error: { color: '#B42318', textAlign: 'center', marginTop: 16 },
  success: { color: '#138A78', textAlign: 'center', fontWeight: '600' },
});
