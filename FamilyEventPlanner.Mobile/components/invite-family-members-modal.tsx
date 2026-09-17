import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type InviteFamilyMembersModalProps = {
  visible: boolean;
  inviteCode: string | null;
  onClose: () => void;
};

export function InviteFamilyMembersModal({
  visible,
  inviteCode,
  onClose,
}: InviteFamilyMembersModalProps) {
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
      message: `Join my family group using this invite code: ${inviteCode}`,
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
            accessibilityLabel="Close invite family members"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onClose}
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={30} color="#5C7090" />
          </Pressable>

          <View style={styles.iconCircle}>
            <MaterialIcons name="group" size={54} color="#1674E8" />
          </View>
          <ThemedText type="title" style={styles.title}>Invite Family Members</ThemedText>
          <ThemedText style={styles.description}>
            Share this code with family members so they can join your family group.
          </ThemedText>

          <View style={styles.codeCard}>
            <ThemedText style={styles.codeLabel}>Your Family Invite Code</ThemedText>
            <View style={styles.codeRow}>
              <ThemedText selectable style={styles.code}>
                {inviteCode ?? 'Unavailable'}
              </ThemedText>
              <Pressable
                accessibilityLabel="Copy family invite code"
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
            accessibilityLabel="Share family invite code"
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
                Anyone with this code can join your family group.
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
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 116,
    height: 116,
    marginTop: -8,
    borderRadius: 58,
    backgroundColor: '#EAF3FF',
  },
  title: {
    marginTop: 22,
    color: '#102A65',
    fontSize: 34,
    lineHeight: 40,
    textAlign: 'center',
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
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 8,
  },
  code: {
    color: '#102A65',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 2,
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
