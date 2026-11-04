import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { COMMUNITY_MEMBERS_LABEL } from '@/constants/communityTerminology';

type InviteCommunityMembersModalProps = {
  visible: boolean;
  inviteCode: string | null;
  onClose: () => void;
};

export function InviteCommunityMembersModal({
  visible,
  inviteCode,
  onClose,
}: InviteCommunityMembersModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCopied(false);
    }
  }, [visible]);

  const copyCode = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
  };

  const shareCode = async () => {
    if (!inviteCode) return;
    await Share.share({
      message: `Join my community using this invite code: ${inviteCode}`,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Pressable
            accessibilityLabel={`Close invite ${COMMUNITY_MEMBERS_LABEL.toLowerCase()}`}
            accessibilityRole="button"
            hitSlop={10}
            onPress={onClose}
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={30} color="#5C7090" />
          </Pressable>

          <ThemedText style={styles.description}>
            Share this code with community members so they can join your community.
          </ThemedText>

          <View style={styles.codeCard}>
            <ThemedText style={styles.codeLabel}>Your Community Invite Code</ThemedText>
            <View style={styles.codeRow}>
              <ThemedText selectable style={styles.code}>
                {inviteCode ?? 'Unavailable'}
              </ThemedText>
              <Pressable
                accessibilityLabel="Copy community invite code"
                accessibilityRole="button"
                disabled={!inviteCode}
                onPress={copyCode}
                style={[styles.copyButton, !inviteCode && styles.disabledButton]}
              >
                <MaterialIcons name="content-copy" size={22} color="#FFFFFF" />
                <ThemedText style={styles.copyButtonText}>Copy Code</ThemedText>
              </Pressable>
            </View>
            {copied && <ThemedText style={styles.copiedText}>Invite code copied!</ThemedText>}
          </View>

          <Pressable
            accessibilityLabel="Share community invite code"
            accessibilityRole="button"
            disabled={!inviteCode}
            onPress={shareCode}
            style={[styles.shareButton, !inviteCode && styles.disabledButton]}
          >
            <MaterialIcons name="ios-share" size={22} color="#1674E8" />
            <ThemedText style={styles.shareButtonText}>Share Invite Code</ThemedText>
          </Pressable>

          <View style={styles.reminder}>
            <MaterialIcons name="info-outline" size={28} color="#1674E8" />
            <View style={styles.reminderCopy}>
              <ThemedText type="defaultSemiBold" style={styles.reminderTitle}>
                Anyone with this code can join your community.
              </ThemedText>
              <ThemedText style={styles.reminderText}>Share it only with people you trust.</ThemedText>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(11, 27, 48, 0.56)',
  },
  card: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 28,
    padding: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginTop: -12,
    marginRight: -12,
  },
  description: {
    maxWidth: 480,
    marginTop: 14,
    color: '#687A96',
    fontSize: 18,
    lineHeight: 25,
    textAlign: 'center',
  },
  codeCard: {
    alignSelf: 'stretch',
    marginTop: 28,
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#EAF4FF',
  },
  codeLabel: {
    color: '#536A8B',
    fontSize: 18,
    textAlign: 'center',
  },
  codeRow: {
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  code: {
    maxWidth: '100%',
    color: '#102A65',
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: '#1674E8',
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  copiedText: {
    marginTop: 8,
    color: '#138A5B',
    fontWeight: '700',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    minHeight: 52,
    marginTop: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#B8D5F7',
  },
  shareButtonText: {
    color: '#1674E8',
    fontSize: 17,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
  reminder: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 14,
    marginTop: 24,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#EAF4FF',
  },
  reminderCopy: {
    flex: 1,
    gap: 4,
  },
  reminderTitle: {
    color: '#102A65',
    fontSize: 15,
  },
  reminderText: {
    color: '#687A96',
    fontSize: 15,
  },
});
