import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InviteFamilyMembersModal } from '@/components/invite-family-members-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActiveGroupContext } from '@/contexts/active-group-context';
import { API_BASE_URL } from '@/config/api';
import { getGroupMembers, type GroupMember } from '@/services/groupMemberService';
import { loadSession } from '@/services/sessionService';

const AVATAR_COLORS = [
  { background: '#E9E1FF', text: '#4A2BC4' },
  { background: '#DDEEFF', text: '#1674E8' },
  { background: '#DDF2EE', text: '#138A78' },
  { background: '#FFE7D0', text: '#C96D22' },
];

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || '?';
}

async function getInviteCode(groupId: string, userId: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/familygroups/my/${userId}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;

    const groups = (await response.json()) as unknown;
    if (!Array.isArray(groups)) return null;

    const group = groups.find((item) => {
      if (!item || typeof item !== 'object') return false;
      const entry = item as { groupId?: string; familyGroupId?: string; id?: string };
      return String(entry.groupId ?? entry.familyGroupId ?? entry.id ?? '') === groupId;
    }) as { inviteCode?: string } | undefined;

    return group?.inviteCode ?? null;
  } catch {
    return null;
  }
}

export default function MembersScreen() {
  const insets = useSafeAreaInsets();
  const { groupId, memberId } = useLocalSearchParams<{ groupId: string; memberId: string }>();
  const {
    groupId: contextGroupId,
    memberId: contextMemberId,
    setActiveGroup,
    isReady,
    isResolvingMember,
  } = useActiveGroupContext();
  const groupIdValue = String(groupId ?? contextGroupId ?? '');
  const memberIdValue = String(memberId ?? contextMemberId ?? '');

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteVisible, setInviteVisible] = useState(false);

  useEffect(() => {
    const update: { groupId?: string; memberId?: string } = {};
    if (groupId) update.groupId = String(groupId);
    if (memberId) update.memberId = String(memberId);
    if (Object.keys(update).length > 0) void setActiveGroup(update);
  }, [groupId, memberId, setActiveGroup]);

  useEffect(() => {
    async function loadMembers() {
      setLoading(true);
      setError(null);

      if (groupIdValue.length === 0 || memberIdValue.length === 0) {
        if (!isReady || isResolvingMember) return;
        setError('Group not found.');
        setLoading(false);
        return;
      }

      try {
        setMembers(await getGroupMembers(groupIdValue, memberIdValue));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }

    void loadMembers();
  }, [groupIdValue, memberIdValue, isReady, isResolvingMember]);

  useEffect(() => {
    async function loadCode() {
      const session = await loadSession();
      if (session?.userId && groupIdValue) {
        setInviteCode(await getInviteCode(groupIdValue, session.userId));
      }
    }

    void loadCode();
  }, [groupIdValue]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 28) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back-ios" size={24} color="#405675" />
          </Pressable>
          <View style={styles.heading}>
            <ThemedText type="title" style={styles.title}>Family Members</ThemedText>
            <ThemedText style={styles.subtitle}>
              The people who make our family special 💙
            </ThemedText>
          </View>
          <Pressable
            accessibilityLabel="Invite family members"
            accessibilityRole="button"
            onPress={() => setInviteVisible(true)}
            style={styles.inviteButton}
          >
            <MaterialIcons name="add-circle-outline" size={24} color="#FFFFFF" />
            <ThemedText style={styles.inviteText}>Invite</ThemedText>
          </Pressable>
        </View>

        {loading && <ThemedText style={styles.feedback}>Loading members...</ThemedText>}
        {!loading && error !== null && <ThemedText style={styles.feedbackError}>{error}</ThemedText>}

        {!loading && error === null && (
          <>
            <ThemedText type="subtitle" style={styles.count}>{members.length} Members</ThemedText>
            <View style={styles.memberList}>
              {members.map((member, index) => {
                const name = member.displayName?.trim() || 'Unknown Guest';
                const palette = AVATAR_COLORS[index % AVATAR_COLORS.length];

                return (
                  <Pressable
                    key={member.memberId ?? `${name}-${index}`}
                    accessibilityLabel={`View ${name}`}
                    accessibilityRole="button"
                    style={styles.memberCard}
                  >
                    <View style={[styles.avatar, { backgroundColor: palette.background }]}>
                      <ThemedText style={[styles.avatarText, { color: palette.text }]}>
                        {getInitials(name)}
                      </ThemedText>
                    </View>
                    <View style={styles.memberCopy}>
                      <ThemedText type="defaultSemiBold" style={styles.memberName} numberOfLines={1}>
                        {name}
                      </ThemedText>
                      <ThemedText style={styles.memberRole}>
                        {member.isAdmin ? 'Admin' : 'Member'}
                      </ThemedText>
                    </View>
                    <MaterialIcons name="chevron-right" size={32} color="#7185A0" />
                  </Pressable>
                );
              })}
              {members.length === 0 && (
                <ThemedText style={styles.feedback}>No members found.</ThemedText>
              )}
            </View>

            <View style={styles.strongerCard}>
              <View style={styles.strongerIcon}>
                <MaterialIcons name="groups" size={42} color="#1674E8" />
              </View>
              <View style={styles.strongerCopy}>
                <ThemedText type="defaultSemiBold" style={styles.strongerTitle}>
                  Stronger Together
                </ThemedText>
                <ThemedText style={styles.strongerText}>
                  Family is better with everyone here.{'\n'}Invite more family members to join!
                </ThemedText>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <InviteFamilyMembersModal
        visible={inviteVisible}
        inviteCode={inviteCode}
        onClose={() => setInviteVisible(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FC' },
  content: { padding: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  backButton: { paddingTop: 8, paddingRight: 2 },
  heading: { flex: 1 },
  title: { color: '#102A65', fontSize: 32, lineHeight: 38 },
  subtitle: { marginTop: 8, color: '#687A96', fontSize: 17, lineHeight: 24 },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#1674E8',
  },
  inviteText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  count: { marginTop: 38, marginBottom: 16, color: '#102A65', fontSize: 24 },
  memberList: { gap: 16 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 116,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#203B5A',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  avatar: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700' },
  memberCopy: { flex: 1, gap: 5 },
  memberName: { color: '#102A65', fontSize: 24, lineHeight: 29 },
  memberRole: { color: '#687A96', fontSize: 18, lineHeight: 24 },
  strongerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 36,
    padding: 22,
    borderRadius: 22,
    backgroundColor: '#EAF4FF',
  },
  strongerIcon: { width: 70, alignItems: 'center' },
  strongerCopy: { flex: 1, gap: 7 },
  strongerTitle: { color: '#102A65', fontSize: 22, lineHeight: 28 },
  strongerText: { color: '#687A96', fontSize: 17, lineHeight: 25 },
  feedback: { marginTop: 24, textAlign: 'center', opacity: 0.7 },
  feedbackError: { marginTop: 24, color: '#C0392B', textAlign: 'center', fontSize: 14 },
});
