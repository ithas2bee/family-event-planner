import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    joinFamilyGroup,
    type JoinGroupResponse,
} from '@/services/groupMemberService';

export default function HomeScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<JoinGroupResponse | null>(null);
  const [joinResponseDebug, setJoinResponseDebug] = useState('');

  const isJoinEnabled = useMemo(() => {
    return inviteCode.trim().length > 0 && name.trim().length > 0 && email.trim().length > 0;
  }, [inviteCode, name, email]);

  const handleJoinPress = async () => {
    // Clear any previous feedback before starting a new request.
    setError(null);
    setSuccessData(null);
    setJoinResponseDebug('');
    setLoading(true);

    try {
      const result = await joinFamilyGroup({ inviteCode: inviteCode.trim(), name: name.trim(), email: email.trim() });
      console.log('join response', result);

      const apiResult = result as JoinGroupResponse & {
        MemberId?: string;
        GroupId?: string;
        MemberName?: string;
        GroupName?: string;
        data?: {
          memberId?: string;
          groupId?: string;
          memberName?: string;
          groupName?: string;
          MemberId?: string;
          GroupId?: string;
          MemberName?: string;
          GroupName?: string;
        };
      };

      const memberId = apiResult.memberId ?? apiResult.MemberId ?? apiResult.data?.memberId ?? apiResult.data?.MemberId;
      const groupId = apiResult.groupId ?? apiResult.GroupId ?? apiResult.data?.groupId ?? apiResult.data?.GroupId;
      const memberName = apiResult.memberName ?? apiResult.MemberName ?? apiResult.data?.memberName ?? apiResult.data?.MemberName;
      const groupName = apiResult.groupName ?? apiResult.GroupName ?? apiResult.data?.groupName ?? apiResult.data?.GroupName;

      const storedJoinData: JoinGroupResponse = {
        memberId,
        groupId,
        memberName,
        groupName,
      };
      setSuccessData(storedJoinData);
      setJoinResponseDebug(JSON.stringify(result));

      router.push({
        pathname: '/family-home',
        params: {
          groupId: String(groupId ?? ''),
          memberId: String(memberId ?? ''),
          groupName: String(groupName ?? ''),
          memberName: String(memberName ?? ''),
        },
      });
    } catch (err) {
      // err is always an Error with a user-friendly message from the service.
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      // Always turn off the spinner whether the request succeeded or failed.
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Join Family Group
      </ThemedText>

      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Invite Code
        </ThemedText>
        <TextInput
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="Example: FAM-8K2P"
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Name
        </ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your full name"
          autoCapitalize="words"
          autoCorrect={false}
          style={styles.input}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="defaultSemiBold" style={styles.label}>
          Email
        </ThemedText>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      </View>

      <Pressable
        onPress={handleJoinPress}
        disabled={!isJoinEnabled || loading}
        style={({ pressed }) => [
          styles.joinButton,
          (!isJoinEnabled || loading) && styles.joinButtonDisabled,
          pressed && isJoinEnabled && !loading && styles.joinButtonPressed,
        ]}>
        {loading ? (
          // ActivityIndicator is the built-in React Native spinner.
          // color="#FFFFFF" makes it visible on the blue button background.
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <ThemedText type="defaultSemiBold" style={styles.joinButtonText}>
            Join
          </ThemedText>
        )}
      </Pressable>

      {/* Show an error message in red when the API call fails. */}
      {error !== null && (
        <ThemedText style={styles.feedbackError}>{error}</ThemedText>
      )}

      {/* Show a success message in green when the API call succeeds. */}
      {successData !== null && (
        <ThemedText style={styles.feedbackSuccess}>
          {successData.groupName
            ? `You joined "${successData.groupName}" successfully!`
            : 'You have joined the family group successfully!'}
        </ThemedText>
      )}

      {joinResponseDebug.length > 0 && (
        <ThemedText style={styles.debugText}>{joinResponseDebug}</ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    textAlign: 'center',
    fontSize: 30,
    lineHeight: 34,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#BCC3CC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  joinButton: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#0A7EA4',
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonPressed: {
    opacity: 0.85,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  feedbackError: {
    color: '#C0392B',
    textAlign: 'center',
    fontSize: 14,
  },
  feedbackSuccess: {
    color: '#1E8449',
    textAlign: 'center',
    fontSize: 14,
  },
  debugText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
