import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import EventCalendarPicker from './EventCalendarPicker';
import { ThemedText } from '../themed-text';

interface Props {
  visible: boolean;
  value: Date | null;
  onChange: (d: Date) => void;
  onClose: () => void;
}

const DatePickerOverlay: React.FC<Props> = ({ visible, value, onChange, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ThemedText type="title" style={styles.title}>Select Date</ThemedText>
          <EventCalendarPicker
            value={value ?? new Date()}
            onChange={(d) => {
              onChange(d);
              onClose(); // close immediately on select
            }}
          />
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
  card: {
    width: '92%',
    backgroundColor: '#23232b',
    borderRadius: 16,
    padding: 12,
  },
  title: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
});

export default DatePickerOverlay;
