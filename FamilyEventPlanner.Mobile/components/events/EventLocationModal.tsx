import React, { useState } from 'react';
import { Modal, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '../themed-text';

interface EventLocationModalProps {
  visible: boolean;
  location: string;
  onChange: (location: string) => void;
  onClose: () => void;
}

export const EventLocationModal: React.FC<EventLocationModalProps> = ({ visible, location, onChange, onClose }) => {
  const [input, setInput] = useState(location);

  const handleSave = () => {
    onChange(input);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ThemedText type="title" style={styles.title}>Set Location</ThemedText>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Enter location or search..."
            autoCapitalize="words"
            autoCorrect={false}
          />
          <ThemedText style={styles.save} onPress={handleSave}>Save</ThemedText>
          <ThemedText style={styles.close} onPress={onClose}>Cancel</ThemedText>
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
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    marginBottom: 16,
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
