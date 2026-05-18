import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '../themed-text';

interface EventDateModalProps {
  visible: boolean;
  date: Date | null;
  endDate: Date | null;
  onChange: (date: Date | null, endDate: Date | null) => void;
  onClose: () => void;
}

export const EventDateModal: React.FC<EventDateModalProps> = ({ visible, date, endDate, onChange, onClose }) => {
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setStartInput(date ? date.toISOString().slice(0, 16) : '');
    setEndInput(endDate ? endDate.toISOString().slice(0, 16) : '');
    setValidationError(null);
  }, [visible, date, endDate]);

  function parseInput(value: string): Date | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const normalized = trimmed.includes('T') ? trimmed : `${trimmed}T00:00`;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function handleApply() {
    const parsedStart = parseInput(startInput);
    const parsedEnd = parseInput(endInput);

    if (!parsedStart) {
      setValidationError('Enter a valid start date/time (YYYY-MM-DDTHH:mm).');
      return;
    }

    if (parsedEnd && parsedEnd.getTime() < parsedStart.getTime()) {
      setValidationError('End date/time must be after start date/time.');
      return;
    }

    onChange(parsedStart, parsedEnd);
    onClose();
  }

  function setNow() {
    const now = new Date();
    setStartInput(now.toISOString().slice(0, 16));
  }

  function clearEnd() {
    setEndInput('');
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ThemedText type="title" style={styles.title}>Select Date & Time</ThemedText>
          <ThemedText style={styles.hint}>Use local date/time in YYYY-MM-DDTHH:mm format.</ThemedText>
          <ThemedText style={styles.label}>Start Date & Time</ThemedText>
          <TextInput
            style={styles.input}
            value={startInput}
            onChangeText={setStartInput}
            placeholder="2026-05-13T18:30"
            placeholderTextColor="#8e95a3"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.actionRow}>
            <Pressable onPress={setNow} style={styles.actionButton}>
              <ThemedText style={styles.actionText}>Use Now</ThemedText>
            </Pressable>
          </View>

          <ThemedText style={styles.label}>End Date (optional)</ThemedText>
          <TextInput
            style={styles.input}
            value={endInput}
            onChangeText={setEndInput}
            placeholder="2026-05-13T21:00"
            placeholderTextColor="#8e95a3"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.actionRow}>
            <Pressable onPress={clearEnd} style={styles.actionButton}>
              <ThemedText style={styles.actionText}>Clear End</ThemedText>
            </Pressable>
          </View>

          {validationError ? <ThemedText style={styles.errorText}>{validationError}</ThemedText> : null}

          <View style={styles.footerRow}>
            <Pressable onPress={onClose}>
              <ThemedText style={styles.close}>Cancel</ThemedText>
            </Pressable>
            <Pressable onPress={handleApply}>
              <ThemedText style={styles.closePrimary}>Apply</ThemedText>
            </Pressable>
          </View>
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
    alignItems: 'stretch',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  hint: {
    color: '#b7bfcc',
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginTop: 14,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#18181f',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionText: {
    color: '#d6dded',
    fontSize: 13,
  },
  errorText: {
    color: '#f28b82',
    marginTop: 12,
    fontSize: 13,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  close: {
    color: '#aeb7c9',
    fontSize: 18,
  },
  closePrimary: {
    color: '#4f8cff',
    fontSize: 18,
  },
});
