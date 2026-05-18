import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '../themed-text';

interface EventSettingsModalProps {
  visible: boolean;
  dressCode: string;
  notes: string;
  onChange: (dressCode: string, notes: string) => void;
  onClose: () => void;
}

export const EventSettingsModal: React.FC<EventSettingsModalProps> = ({ visible, dressCode, notes, onChange, onClose }) => {
  const [localDressCode, setLocalDressCode] = useState(dressCode);
  const [localNotes, setLocalNotes] = useState(notes);

  const handleSave = () => {
    onChange(localDressCode, localNotes);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView>
            <ThemedText type="title" style={styles.title}>Advanced Settings</ThemedText>
            <ThemedText style={styles.label}>Dress Code</ThemedText>
            <TextInput
              style={styles.input}
              value={localDressCode}
              onChangeText={setLocalDressCode}
              placeholder="Optional dress code"
              autoCapitalize="words"
              autoCorrect={false}
            />
            <ThemedText style={styles.label}>Notes</ThemedText>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={localNotes}
              onChangeText={setLocalNotes}
              placeholder="Optional notes"
              multiline
            />
            <ThemedText style={styles.save} onPress={handleSave}>Save</ThemedText>
            <ThemedText style={styles.close} onPress={onClose}>Cancel</ThemedText>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#23232b',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#18181f',
    color: '#fff',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 16,
    fontSize: 16,
  },
  save: {
    color: '#4f8cff',
    fontSize: 18,
    marginTop: 8,
  },
  close: {
    color: '#aaa',
    fontSize: 16,
    marginTop: 12,
  },
});
