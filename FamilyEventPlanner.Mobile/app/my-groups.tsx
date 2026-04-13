import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { clearSession, loadSession, type AppSession } from '@/services/sessionService';

export default function MyGroupsScreen() {
  const [session, setSession] = useState<AppSession | null>(null);

  useEffect(() => {
    loadSession().then(setSession);
  }, []);

  const handleJoinGroup = useCallback(() => {
    router.push('/join-group');
  }, []);

  const handleCreateGroup = useCallback(() => {
    Alert.alert('Coming Soon', 'Create Group is not yet available.');
  }, []);

  const handleLogout = useCallback(async () => {
    await clearSession();
    router.replace('/auth');
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        My Groups
      </ThemedText>

      {session?.displayName ? (
        <ThemedText style={styles.welcome}>
          Welcome, {session.displayName}
        </ThemedText>
      ) : null}

      <ThemedView style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Your Groups
        </ThemedText>

        {session?.groupName ? (
          <Pressable
            style={styles.groupCard}
            onPress={() =>
              router.push({
                pathname: '/family-home',
                params: {
                  groupId: session.groupId,
                  memberId: session.memberId,
                  groupName: session.groupName,
                  memberName: session.memberName,
                },
              })
            }
          >
            <ThemedText type="defaultSemiBold" style={styles.groupCardName}>
              {session.groupName}
            </ThemedText>
            <ThemedText style={styles.groupCardSub}>
              Tap to open
            </ThemedText>
          </Pressable>
        ) : (
          <ThemedText style={styles.emptyText}>
            You have not joined any groups yet.
          </ThemedText>
        )}
      </ThemedView>

      <ThemedView style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={handleJoinGroup}>
          <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
            Join a Group
          </ThemedText>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleCreateGroup}>
          <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
            Create a Group
          </ThemedText>
        </Pressable>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <ThemedText type="defaultSemiBold" style={styles.logoutButtonText}>
            Log Out
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    gap: 20,
  },
  title: {
    fontSize: 32,
  },
  welcome: {
    fontSize: 16,
    marginTop: -12,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
  },
  groupCard: {
    borderWidth: 1,
    borderColor: '#BCC3CC',
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  groupCardName: {
    fontSize: 16,
  },
  groupCardSub: {
    fontSize: 13,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#0A7EA4',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0A7EA4',
  },
  secondaryButtonText: {
    color: '#0A7EA4',
    fontSize: 16,
  },
  logoutButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#C0392B',
    fontSize: 15,
  },
});
