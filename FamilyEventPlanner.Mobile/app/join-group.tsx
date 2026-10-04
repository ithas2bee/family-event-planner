import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useActiveGroupContext } from '@/contexts/active-group-context';
import { searchGroups, type GroupSearchResult } from '@/services/groupSearchService';
import { joinFamilyGroup } from '@/services/groupMemberService';
import { loadSession, saveSession, type AppSession } from '@/services/sessionService';

export default function JoinGroupScreen() {
  const { setActiveGroup } = useActiveGroupContext();
  const [session, setSession] = useState<AppSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [groups, setGroups] = useState<GroupSearchResult[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const runSearch = useCallback(async (query: string, currentSession: AppSession | null) => {
    if (!currentSession?.authToken && !currentSession?.memberId) {
      setSearchError('Please sign in again to search for groups.');
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setHasSearched(true);
    setSelectedGroupId(null);
    try {
      setGroups(await searchGroups(query, currentSession.authToken, currentSession.memberId));
    } catch (err: unknown) {
      setGroups([]);
      setSearchError(err instanceof Error ? err.message : 'Could not search groups. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    async function restoreSession() {
      const existing = await loadSession();
      if (!existing) {
        router.replace('/auth');
        return;
      }
      setSession(existing);
      void runSearch('', existing);
    }

    restoreSession();
  }, [runSearch]);

  const canJoin = inviteCode.trim().length > 0 && session !== null;

  async function handleJoin() {
    if (!session) {
      setJoinError('Please log in before joining a group.');
      return;
    }

    setJoinError(null);
    setJoinLoading(true);
    try {
      const result = await joinFamilyGroup({
        inviteCode: inviteCode.trim(),
        userId: session.userId,
      });

      const groupId = String(result.groupId ?? '');
      const memberId = String(result.memberId ?? '');
      const groupName = String(result.groupName ?? '');
      const memberName = String(result.memberName ?? session.displayName);

      await saveSession({
        ...session,
        memberId,
        groupId,
        memberName,
        groupName,
        isAdmin: false,
        authToken: null,
      });

      await setActiveGroup({
        groupId,
        groupName,
        memberId,
        memberName,
      });

      router.replace({
        pathname: '/(tabs)/family-home',
        params: { groupId, memberId, groupName, memberName },
      });
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setJoinLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.introduction}>
        <Text style={styles.title}>Find your community</Text>
        <Text style={styles.subtitle}>
          Search groups that are open to discovery. You can view group information here without
          joining.
        </Text>
      </View>

      <View style={styles.joinCard}>
        <Text style={styles.cardTitle}>Search groups</Text>
        <TextInput
          style={styles.input}
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={() => void runSearch(searchTerm, session)}
          placeholder="Search by group name"
          placeholderTextColor="#8291A8"
          returnKeyType="search"
          accessibilityLabel="Search groups by name"
        />
        <Pressable
          style={[styles.joinButton, searchLoading && styles.joinButtonDisabled]}
          onPress={() => void runSearch(searchTerm, session)}
          disabled={searchLoading}
          accessibilityRole="button"
        >
          {searchLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.joinButtonText}>Search</Text>
          )}
        </Pressable>
        {searchError !== null && <Text accessibilityRole="alert" style={styles.feedbackError}>{searchError}</Text>}
      </View>

      {searchLoading && groups.length === 0 ? (
        <View style={styles.feedbackRow}>
          <ActivityIndicator color="#2588EA" />
          <Text style={styles.feedbackCopy}>Searching groups…</Text>
        </View>
      ) : null}

      {!searchLoading && !searchError && hasSearched && groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={30} color="#5B7FEA" />
          <Text style={styles.emptyTitle}>No groups found</Text>
          <Text style={styles.emptyCopy}>Try another group name or check your spelling.</Text>
        </View>
      ) : null}

      {groups.map((group) => {
        const requiresInvitation = group.accessMode === 'InviteOnlySearchable';
        const accessLabel = requiresInvitation ? 'Invite Only • Invitation Required' : 'Community • Request to Join';
        const isSelected = selectedGroupId === group.groupId;
        return (
          <Pressable
            key={group.groupId}
            style={styles.resultCard}
            onPress={() => setSelectedGroupId(isSelected ? null : group.groupId)}
            accessibilityRole="button"
            accessibilityLabel={`View ${group.groupName}`}
            accessibilityState={{ expanded: isSelected }}
          >
            <View style={styles.resultHeading}>
              <View style={styles.resultIcon}>
                <Ionicons name="people" size={21} color="#2588EA" />
              </View>
              <View style={styles.resultCopy}>
                <Text style={styles.resultName}>{group.groupName}</Text>
                <Text style={styles.resultType}>Community type · {group.groupType}</Text>
              </View>
              <Ionicons name={isSelected ? 'chevron-up' : 'chevron-down'} size={20} color="#687994" />
            </View>
            <Text style={[styles.accessLabel, requiresInvitation ? styles.inviteLabel : styles.communityLabel]}>
              {accessLabel}
            </Text>
            {isSelected ? (
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedInfoLabel}>Community type</Text>
                <Text style={styles.selectedInfoValue}>{group.groupType}</Text>
                <Text style={styles.selectedInfoLabel}>Access</Text>
                <Text style={styles.selectedInfoValue}>{accessLabel}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}

      <View style={styles.joinCard}>
        <Text style={styles.cardTitle}>Have an invitation code?</Text>
        <Text style={styles.cardDescription}>Use a code shared with you to join a group.</Text>
        <TextInput
          style={styles.input}
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="Enter invite code"
          placeholderTextColor="#8291A8"
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel="Invite code"
        />
        <Pressable
          style={[styles.joinButton, (!canJoin || joinLoading) && styles.joinButtonDisabled]}
          onPress={handleJoin}
          disabled={!canJoin || joinLoading}
          accessibilityRole="button"
        >
          {joinLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.joinButtonText}>Join with Code</Text>
          )}
        </Pressable>
        {joinError !== null && <Text accessibilityRole="alert" style={styles.feedbackError}>{joinError}</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6FAFF',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 36,
    gap: 20,
  },
  introduction: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    textAlign: 'center',
    color: '#101C4C',
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '800',
  },
  subtitle: {
    maxWidth: 350,
    color: '#5E6D89',
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
  },
  joinCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#5B7FEA',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    gap: 14,
  },
  cardTitle: {
    color: '#101C4C',
    fontSize: 23,
    fontWeight: '800',
  },
  cardDescription: {
    color: '#687994',
    fontSize: 15,
    lineHeight: 21,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D3DEEF',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: '#101C4C',
    fontSize: 18,
    backgroundColor: '#FBFDFF',
  },
  joinButton: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2588EA',
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  feedbackError: {
    color: '#C0392B',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  feedbackCopy: {
    color: '#5E6D89',
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#EAF3FF',
  },
  emptyTitle: {
    color: '#101C4C',
    fontSize: 19,
    fontWeight: '800',
  },
  emptyCopy: {
    color: '#687994',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  resultCard: {
    padding: 18,
    gap: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE8F7',
    shadowColor: '#5B7FEA',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  resultHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2F0FF',
  },
  resultCopy: {
    flex: 1,
    gap: 3,
  },
  resultName: {
    color: '#101C4C',
    fontSize: 18,
    fontWeight: '800',
  },
  resultType: {
    color: '#5E6D89',
    fontSize: 15,
  },
  accessLabel: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    fontSize: 13,
    fontWeight: '700',
  },
  inviteLabel: {
    color: '#7B4D00',
    backgroundColor: '#FFF0C2',
  },
  communityLabel: {
    color: '#17613D',
    backgroundColor: '#DDF5E8',
  },
  selectedInfo: {
    gap: 3,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E3EBF6',
  },
  selectedInfoLabel: {
    marginTop: 6,
    color: '#687994',
    fontSize: 13,
    fontWeight: '700',
  },
  selectedInfoValue: {
    color: '#101C4C',
    fontSize: 15,
  },
});
