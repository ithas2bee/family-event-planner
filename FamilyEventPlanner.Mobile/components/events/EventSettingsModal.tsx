import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../themed-text';

interface EventSettingsModalProps {
  visible: boolean;
  dressCode: string;
  notes: string;
  onChange: (dressCode: string, notes: string) => void;
  onClose: () => void;
}

export const EventSettingsModal: React.FC<EventSettingsModalProps> = ({
  visible,
  dressCode,
  notes,
  onChange,
  onClose,
}) => {
  const [localDressCode, setLocalDressCode] = useState(dressCode);
  const [localNotes, setLocalNotes] = useState(notes);

  useEffect(() => {
    if (visible) {
      setLocalDressCode(dressCode);
      setLocalNotes(notes);
    }
  }, [visible, dressCode, notes]);

  const handleSave = () => {
    onChange(localDressCode, localNotes);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modal}>
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <MaterialIcons name="tune" size={30} color="#635BDB" />
              </View>
              <View style={styles.headerCopy}>
                <ThemedText type="title" style={styles.title}>Additional Details</ThemedText>
                <ThemedText style={styles.subtitle}>
                  Add optional details to help your family know what to expect.
                </ThemedText>
              </View>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                <MaterialIcons name="close" size={30} color="#687A96" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.fieldHeader}>
                <View style={[styles.fieldIcon, styles.fieldIconBlue]}>
                  <MaterialIcons name="checkroom" size={22} color="#2878D6" />
                </View>
                <View style={styles.fieldCopy}>
                  <ThemedText style={styles.label}>Dress Code (Optional)</ThemedText>
                  <ThemedText style={styles.hint}>Let your family know if there&apos;s a dress code.</ThemedText>
                </View>
              </View>
              <TextInput
                style={styles.input}
                value={localDressCode}
                onChangeText={setLocalDressCode}
                placeholder="e.g. Casual, White T-shirts, Formal, etc."
                placeholderTextColor="#8CA0B8"
                autoCapitalize="words"
                autoCorrect={false}
                accessibilityLabel="Dress Code"
              />

              <View style={styles.fieldHeader}>
                <View style={[styles.fieldIcon, styles.fieldIconGreen]}>
                  <MaterialIcons name="description" size={22} color="#159B82" />
                </View>
                <View style={styles.fieldCopy}>
                  <ThemedText style={styles.label}>Notes (Optional)</ThemedText>
                  <ThemedText style={styles.hint}>Add any other important information about your event.</ThemedText>
                </View>
              </View>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={localNotes}
                onChangeText={setLocalNotes}
                placeholder="e.g. What to bring, parking info, special instructions..."
                placeholderTextColor="#8CA0B8"
                multiline
                maxLength={500}
                textAlignVertical="top"
                accessibilityLabel="Notes"
              />
              <ThemedText style={styles.characterCount}>{localNotes.length}/500</ThemedText>
            </ScrollView>

            <View style={styles.actions}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <ThemedText style={styles.cancelText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                accessibilityRole="button"
                accessibilityLabel="Save"
              >
                <ThemedText style={styles.saveText}>Save</ThemedText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 30, 50, 0.52)',
    justifyContent: 'center',
    padding: 16,
  },
  keyboardArea: {
    width: '100%',
    maxHeight: '94%',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#203B5A',
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 24,
    paddingBottom: 16,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEEDFF',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: '#111A30',
    fontSize: 25,
    lineHeight: 31,
  },
  subtitle: {
    color: '#687A96',
    fontSize: 15,
    lineHeight: 21,
  },
  content: {
    maxHeight: 470,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginBottom: 10,
  },
  fieldIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldIconBlue: {
    backgroundColor: '#E7F0FF',
  },
  fieldIconGreen: {
    backgroundColor: '#E4F7F0',
  },
  fieldCopy: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: '#111A30',
    fontSize: 17,
    fontWeight: '700',
  },
  hint: {
    color: '#687A96',
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: '#D2DEED',
    borderRadius: 16,
    paddingHorizontal: 16,
    color: '#16213A',
    fontSize: 16,
  },
  notesInput: {
    minHeight: 150,
    paddingTop: 14,
  },
  characterCount: {
    color: '#687A96',
    fontSize: 13,
    textAlign: 'right',
    marginTop: -28,
    marginRight: 14,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E3EAF3',
  },
  button: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: '#A8BBD2',
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#1678E8',
  },
  cancelText: {
    color: '#56708E',
    fontSize: 17,
    fontWeight: '700',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
