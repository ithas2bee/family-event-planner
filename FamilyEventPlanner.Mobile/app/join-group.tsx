import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { joinFamilyGroup } from '@/services/groupMemberService';
import { loadSession, saveSession, type AppSession } from '@/services/sessionService';

export default function JoinGroupScreen() {
  const { setActiveGroup } = useActiveGroupContext();
  const [session, setSession] = useState<AppSession | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function restoreSession() {
      const existing = await loadSession();
      if (!existing) {
        router.replace('/auth');
        return;
      }
      setSession(existing);
    }

    restoreSession();
  }, []);

  const canJoin = inviteCode.trim().length > 0 && session !== null;

  async function handleJoin() {
    if (!session) {
      setError('Please log in before joining a group.');
      return;
    }

    setError(null);
    setLoading(true);
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
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topRow}>
        <View style={styles.houseIcon}>
          <Ionicons name="home" size={28} color="#1976D2" />
          <Ionicons name="heart" size={13} color="#FFFFFF" style={styles.houseHeart} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Need help">
          <Text style={styles.helpText}>? Need Help?</Text>
        </Pressable>
      </View>

      <View style={styles.introduction}>
        <Text style={styles.title}>Family Together{'\n'}Starts Here</Text>
        <Text style={styles.subtitle}>
          Join your family group to start sharing events, updates, and making great memories
          together.
        </Text>
        <View style={styles.familyIllustration} accessibilityLabel="Family illustration">
          <View style={[styles.person, styles.personBlue]}>
            <Text style={styles.personFace}>👨🏻</Text>
          </View>
          <View style={[styles.person, styles.personPink]}>
            <Text style={styles.personFace}>👩🏻</Text>
          </View>
          <View style={[styles.person, styles.personPurple]}>
            <Text style={styles.personFace}>👵🏻</Text>
          </View>
          <View style={[styles.person, styles.personYellow]}>
            <Text style={styles.personFace}>🧒🏻</Text>
          </View>
        </View>
      </View>

      <View style={styles.joinCard}>
        <View style={styles.cardHeading}>
          <View style={styles.keyIcon}>
            <Ionicons name="key" size={28} color="#1976D2" />
          </View>
          <View style={styles.cardHeadingCopy}>
            <Text style={styles.cardTitle}>Enter Invite Code</Text>
            <Text style={styles.cardDescription}>
              Enter the code you received from a family member to join their group.
            </Text>
          </View>
        </View>
        <TextInput
          style={styles.input}
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="e.g. ABC123"
          placeholderTextColor="#9AAAC2"
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel="Invite code"
        />
        <Pressable
          style={[styles.joinButton, (!canJoin || loading) && styles.joinButtonDisabled]}
          onPress={handleJoin}
          disabled={!canJoin || loading}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.joinButtonText}>Join Family Group</Text>
          )}
        </Pressable>
        {error !== null && <Text style={styles.feedbackError}>{error}</Text>}
      </View>

      <View style={styles.noInviteCard}>
        <View style={styles.noInviteIcon}>
          <Ionicons name="mail-open" size={30} color="#5B7FEA" />
        </View>
        <View style={styles.noInviteCopy}>
          <Text style={styles.noInviteTitle}>New to Family Circle?</Text>
          <Text style={styles.noInviteText}>
            An invite code is the easiest way to join your family&apos;s group. If you don&apos;t
            have a code, ask a family member to send you one.
          </Text>
        </View>
      </View>
      <Text style={styles.footerText}>Your family&apos;s events, updates, and moments—all together.</Text>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  houseIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDEEFF',
    position: 'relative',
  },
  houseHeart: {
    position: 'absolute',
    top: 20,
  },
  helpText: {
    color: '#176CC3',
    fontSize: 15,
    fontWeight: '700',
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
  familyIllustration: {
    height: 130,
    width: '100%',
    maxWidth: 340,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: 14,
  },
  person: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginHorizontal: -5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: '#F6FAFF',
  },
  personFace: {
    fontSize: 42,
  },
  personBlue: {
    backgroundColor: '#B9D9FF',
    transform: [{ translateY: 18 }],
  },
  personPink: {
    backgroundColor: '#F8C6D8',
    zIndex: 1,
  },
  personPurple: {
    backgroundColor: '#D8CCFA',
    transform: [{ translateY: 18 }],
  },
  personYellow: {
    backgroundColor: '#FFE0A6',
    transform: [{ translateY: 34 }],
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
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  keyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2F0FF',
  },
  cardHeadingCopy: {
    flex: 1,
    gap: 4,
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
  noInviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#EAF3FF',
  },
  noInviteIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D6E7FF',
  },
  noInviteCopy: {
    flex: 1,
    gap: 5,
  },
  noInviteTitle: {
    color: '#101C4C',
    fontSize: 18,
    fontWeight: '800',
  },
  noInviteText: {
    color: '#687994',
    fontSize: 14,
    lineHeight: 20,
  },
  footerText: {
    color: '#176CC3',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
