import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { GroupMember } from '@/services/groupMemberService';

type FamilyMembersSectionProps = {
  members: GroupMember[];
  currentMemberId: string;
  loading?: boolean;
  onViewAll: () => void;
  onInvite: () => void;
};

export function getMemberInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function FamilyMembersSection({
  members,
  currentMemberId,
  loading = false,
  onViewAll,
  onInvite,
}: FamilyMembersSectionProps) {
  return (
    <ThemedView style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Family Members
        </ThemedText>
        <Pressable onPress={onViewAll} hitSlop={8} accessibilityRole="button">
          <ThemedText type="defaultSemiBold" style={styles.viewAllText}>
            See All
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowContent}
      >
        {loading ? (
          <ThemedText style={styles.feedback}>Loading members...</ThemedText>
        ) : (
          <>
            {members.map((member, index) => {
              const isCurrentUser = member.memberId === currentMemberId;
              const name = isCurrentUser ? 'You' : member.displayName?.trim() || 'Unknown Member';
              const role = member.isAdmin ? 'Admin' : 'Member';

              return (
                <View key={member.memberId ?? `${name}-${index}`} style={styles.member}>
                  <View style={[styles.avatar, isCurrentUser && styles.currentAvatar]}>
                    <ThemedText style={[styles.avatarText, isCurrentUser && styles.currentAvatarText]}>
                      {getMemberInitials(name)}
                    </ThemedText>
                  </View>
                  <ThemedText type="defaultSemiBold" style={styles.memberName} numberOfLines={1}>
                    {name}
                  </ThemedText>
                  <ThemedText style={styles.memberRole} numberOfLines={1}>
                    {role}
                  </ThemedText>
                </View>
              );
            })}

            <Pressable
              style={styles.member}
              onPress={onInvite}
              accessibilityRole="button"
              accessibilityLabel="Invite Family"
            >
              <View style={styles.inviteAvatar}>
                <ThemedText style={styles.invitePlus}>+</ThemedText>
              </View>
              <ThemedText type="defaultSemiBold" style={styles.memberName} numberOfLines={1}>
                Invite
              </ThemedText>
              <ThemedText style={styles.memberRole} numberOfLines={1}>
                Family
              </ThemedText>
            </Pressable>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
  },
  viewAllText: {
    color: '#0A7EA4',
    fontSize: 14,
  },
  rowContent: {
    gap: 20,
    paddingRight: 12,
  },
  member: {
    alignItems: 'center',
    width: 72,
    gap: 3,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCEAF0',
    marginBottom: 4,
  },
  currentAvatar: {
    backgroundColor: '#0A7EA4',
  },
  currentAvatarText: {
    color: '#FFFFFF',
  },
  avatarText: {
    color: '#174B5C',
    fontSize: 18,
    fontWeight: '700',
  },
  inviteAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#0A7EA4',
    marginBottom: 4,
  },
  invitePlus: {
    color: '#0A7EA4',
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '300',
  },
  memberName: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  memberRole: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.65,
    textAlign: 'center',
  },
  feedback: {
    opacity: 0.7,
  },
});
