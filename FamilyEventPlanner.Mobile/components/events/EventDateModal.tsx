import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import DatePickerOverlay from './DatePickerOverlay';
import TimePickerModal from './TimePickerModal';
import { ThemedText } from '../themed-text';
import { PillButton } from '../ui/pill-button';

interface EventDateModalProps {
  visible: boolean;
  date: Date | null;
  endDate: Date | null;
  onChange: (date: Date | null, endDate: Date | null) => void;
  onClose: () => void;
}

export const EventDateModal: React.FC<EventDateModalProps> = ({ visible, date, endDate, onChange, onClose }) => {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);
  const [showEndPicker, setShowEndPicker] = useState(false);
  // time components for start
  const [startHour, setStartHour] = useState<number>(12);
  const [startMinute, setStartMinute] = useState<number>(0);
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>('PM');
  const [activeOverlay, setActiveOverlay] = useState<null | 'startDate' | 'startTime' | 'endDate' | 'endTime'>(null);
  // time components for end
  const [endHour, setEndHour] = useState<number>(12);
  const [endMinute, setEndMinute] = useState<number>(0);
  const [endAmPm, setEndAmPm] = useState<'AM' | 'PM'>('PM');

  useEffect(() => {
    if (!visible) {
      return;
    }
    setValidationError(null);
    setSelectedStart(date ?? null);
    setSelectedEnd(endDate ?? null);
    if (date) {
      const h = date.getHours();
      setStartAmPm(h >= 12 ? 'PM' : 'AM');
      setStartHour(((h + 11) % 12) + 1);
      setStartMinute(date.getMinutes());
    }
    if (endDate) {
      const eh = endDate.getHours();
      setEndAmPm(eh >= 12 ? 'PM' : 'AM');
      setEndHour(((eh + 11) % 12) + 1);
      setEndMinute(endDate.getMinutes());
      setShowEndPicker(true);
    }
  }, [visible, date, endDate]);

  function buildDateFromSelected(date: Date | null, hour: number, minute: number, ampm: 'AM' | 'PM') {
    if (!date) return null;
    let h = hour % 12;
    if (ampm === 'PM') h += 12;
    const d = new Date(date);
    d.setHours(h, minute, 0, 0);
    return d;
  }

  function handleApply() {
    const builtStart = buildDateFromSelected(selectedStart, startHour, startMinute, startAmPm);
    const builtEnd = showEndPicker ? buildDateFromSelected(selectedEnd, endHour, endMinute, endAmPm) : null;

    if (!builtStart) {
      setValidationError('Select a valid start date and time.');
      return;
    }

    if (builtEnd && builtEnd.getTime() < builtStart.getTime()) {
      setValidationError('End date/time must be after start date/time.');
      return;
    }

    onChange(builtStart, builtEnd);
    onClose();
  }

  function setNow() {
    const now = new Date();
    setSelectedStart(now);
    const h = now.getHours();
    setStartAmPm(h >= 12 ? 'PM' : 'AM');
    setStartHour(((h + 11) % 12) + 1);
    setStartMinute(now.getMinutes());
  }

  function clearEnd() {
    setSelectedEnd(null);
    setShowEndPicker(false);
    setEndHour(12);
    setEndMinute(0);
    setEndAmPm('PM');
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ThemedText type="title" style={styles.title}>Select Date & Time</ThemedText>
          <ThemedText style={styles.label}>Start</ThemedText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <PillButton onPress={() => setActiveOverlay('startDate')}>{selectedStart ? new Date(selectedStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select Date'}</PillButton>
            <PillButton onPress={() => setActiveOverlay('startTime')}>{selectedStart ? new Date(buildDateFromSelected(selectedStart,startHour??12,startMinute??0,startAmPm??'PM') as Date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'Select Time'}</PillButton>
          </View>
          <View style={styles.actionRow}>
            <Pressable onPress={setNow} style={styles.actionButton}>
              <ThemedText style={styles.actionText}>Use Now</ThemedText>
            </Pressable>
          </View>

          <ThemedText style={styles.label}>Ends</ThemedText>
          {!showEndPicker ? (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <PillButton onPress={() => setShowEndPicker(true)} size="small">Add End Time</PillButton>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <PillButton onPress={() => setActiveOverlay('endDate')}>{selectedEnd ? new Date(selectedEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select Date'}</PillButton>
                <PillButton onPress={() => setActiveOverlay('endTime')}>{selectedEnd ? new Date(buildDateFromSelected(selectedEnd,endHour??12,endMinute??0,endAmPm??'PM') as Date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'Select Time'}</PillButton>
              </View>
              <View style={styles.actionRow}>
                <Pressable onPress={clearEnd} style={styles.actionButton}>
                  <ThemedText style={styles.actionText}>Clear End</ThemedText>
                </Pressable>
              </View>
            </>
          )}

          <DatePickerOverlay visible={activeOverlay==='startDate' || activeOverlay==='endDate'} value={activeOverlay==='startDate' ? selectedStart ?? date : selectedEnd ?? endDate} onChange={(d) => {
            if (activeOverlay==='startDate') {
              setSelectedStart(d);
              const h = d.getHours();
              setStartAmPm(h >= 12 ? 'PM' : 'AM');
              setStartHour(((h + 11) % 12) + 1);
              setStartMinute(d.getMinutes());
            } else {
              setSelectedEnd(d);
              const h = d.getHours();
              setEndAmPm(h >= 12 ? 'PM' : 'AM');
              setEndHour(((h + 11) % 12) + 1);
              setEndMinute(d.getMinutes());
            }
            setActiveOverlay(null);
          }} onClose={() => setActiveOverlay(null)} />

          <TimePickerModal visible={activeOverlay==='startTime' || activeOverlay==='endTime'} initialHour={activeOverlay==='startTime' ? startHour : endHour} initialMinute={activeOverlay==='startTime' ? startMinute : endMinute} initialAmPm={activeOverlay==='startTime' ? startAmPm : endAmPm} onCancel={() => setActiveOverlay(null)} onDone={(h,m,ap) => {
            if (activeOverlay==='startTime') {
              setStartHour(h);
              setStartMinute(m);
              setStartAmPm(ap);
            } else {
              setEndHour(h);
              setEndMinute(m);
              setEndAmPm(ap);
            }
            setActiveOverlay(null);
          }} />

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
