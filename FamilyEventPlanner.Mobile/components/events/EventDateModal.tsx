import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, DateData } from 'react-native-calendars';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '../themed-text';

interface EventDateModalProps {
  visible: boolean;
  date: Date | null;
  endDate: Date | null;
  onChange: (date: Date | null, endDate: Date | null) => void;
  onClose: () => void;
}

type PickerSection = 'start' | 'end';
type AmPm = 'AM' | 'PM';

const hours = Array.from({ length: 12 }, (_, index) => index + 1);
const minutes = [0, 15, 30, 45];

function getTimeParts(value: Date | null): { hour: number; minute: number; amPm: AmPm } {
  if (!value) return { hour: 12, minute: 0, amPm: 'PM' };
  const hour = value.getHours();
  return {
    hour: ((hour + 11) % 12) + 1,
    minute: minutes.reduce((closest, option) =>
      Math.abs(option - value.getMinutes()) < Math.abs(closest - value.getMinutes()) ? option : closest, 0),
    amPm: hour >= 12 ? 'PM' : 'AM',
  };
}

function withTime(date: Date, hour: number, minute: number, amPm: AmPm) {
  const result = new Date(date);
  let hours24 = hour % 12;
  if (amPm === 'PM') hours24 += 12;
  result.setHours(hours24, minute, 0, 0);
  return result;
}

function formatDate(value: Date | null) {
  return value?.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) ?? 'Select date';
}

function formatTime(value: Date | null) {
  return value?.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) ?? 'Select time';
}

export const EventDateModal: React.FC<EventDateModalProps> = ({ visible, date, endDate, onChange, onClose }) => {
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState(getTimeParts(null));
  const [endTime, setEndTime] = useState(getTimeParts(null));
  const [section, setSection] = useState<PickerSection>('start');
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSelectedStart(date);
    setSelectedEnd(endDate);
    setStartTime(getTimeParts(date));
    setEndTime(getTimeParts(endDate));
    setShowEndPicker(endDate !== null);
    setSection('start');
    setValidationError(null);
  }, [visible, date, endDate]);

  const activeDate = section === 'start' ? selectedStart : selectedEnd;
  const markedDates = useMemo(() => {
    const marked: Record<string, { selected: boolean; selectedColor: string }> = {};
    if (selectedStart) marked[selectedStart.toISOString().slice(0, 10)] = { selected: true, selectedColor: '#087AC5' };
    if (selectedEnd) marked[selectedEnd.toISOString().slice(0, 10)] = { selected: true, selectedColor: '#5B8DEF' };
    return marked;
  }, [selectedStart, selectedEnd]);

  function handleDayPress(day: DateData) {
    const current = activeDate ?? new Date();
    const [year, month, dayNumber] = day.dateString.split('-').map(Number);
    const nextDate = new Date(year, month - 1, dayNumber, current.getHours(), current.getMinutes(), 0, 0);
    if (section === 'start') setSelectedStart(nextDate);
    else setSelectedEnd(nextDate);
  }

  function updateTime(hour: number, minute: number, amPm: AmPm) {
    if (section === 'start') setStartTime({ hour, minute, amPm });
    else setEndTime({ hour, minute, amPm });
  }

  function setNow() {
    const now = new Date();
    setSelectedStart(now);
    setStartTime(getTimeParts(now));
    setSection('start');
  }

  function clearEnd() {
    setSelectedEnd(null);
    setShowEndPicker(false);
    setValidationError(null);
  }

  function handleApply() {
    const builtStart = selectedStart ? withTime(selectedStart, startTime.hour, startTime.minute, startTime.amPm) : null;
    const builtEnd = showEndPicker && selectedEnd ? withTime(selectedEnd, endTime.hour, endTime.minute, endTime.amPm) : null;
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

  const selectedTime = section === 'start' ? startTime : endTime;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.eyebrow}>EVENT SCHEDULE</ThemedText>
              <ThemedText type="title" style={styles.title}>Select date & time</ThemedText>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close date and time picker">
              <ThemedText style={styles.close}>×</ThemedText>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.sectionTabs}>
              <Pressable style={[styles.sectionTab, section === 'start' && styles.sectionTabActive]} onPress={() => setSection('start')}>
                <ThemedText style={[styles.sectionTabText, section === 'start' && styles.sectionTabTextActive]}>Start</ThemedText>
                <ThemedText style={styles.summary}>{formatDate(selectedStart)} · {formatTime(selectedStart ? withTime(selectedStart, startTime.hour, startTime.minute, startTime.amPm) : null)}</ThemedText>
              </Pressable>
              <Pressable style={[styles.sectionTab, section === 'end' && styles.sectionTabActive]} onPress={() => showEndPicker && setSection('end')}>
                <ThemedText style={[styles.sectionTabText, section === 'end' && styles.sectionTabTextActive]}>End</ThemedText>
                <ThemedText style={styles.summary}>{showEndPicker ? `${formatDate(selectedEnd)} · ${formatTime(selectedEnd ? withTime(selectedEnd, endTime.hour, endTime.minute, endTime.amPm) : null)}` : 'Optional'}</ThemedText>
              </Pressable>
            </View>

            <View style={styles.calendarCard}>
              <Calendar
                current={(activeDate ?? new Date()).toISOString().slice(0, 10)}
                onDayPress={handleDayPress}
                markedDates={markedDates}
                enableSwipeMonths
                theme={{
                  backgroundColor: '#FFFFFF',
                  calendarBackground: '#FFFFFF',
                  textSectionTitleColor: '#71829C',
                  dayTextColor: '#17213D',
                  todayTextColor: '#087AC5',
                  arrowColor: '#087AC5',
                  monthTextColor: '#17213D',
                  textMonthFontWeight: '700',
                  textDayFontSize: 14,
                  textDayHeaderFontSize: 11,
                }}
              />
            </View>

            <ThemedText style={styles.timeLabel}>Time</ThemedText>
            <View style={styles.timeSelector}>
              <View style={styles.timeColumn}>
                <ThemedText style={styles.columnLabel}>HOUR</ThemedText>
                <View style={styles.choiceGrid}>
                  {hours.map((hour) => (
                    <Pressable key={hour} onPress={() => updateTime(hour, selectedTime.minute, selectedTime.amPm)} style={[styles.choice, selectedTime.hour === hour && styles.choiceSelected]}>
                      <ThemedText style={[styles.choiceText, selectedTime.hour === hour && styles.choiceTextSelected]}>{hour}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.timeColumn}>
                <ThemedText style={styles.columnLabel}>MIN</ThemedText>
                <View style={styles.choiceGrid}>
                  {minutes.map((minute) => (
                    <Pressable key={minute} onPress={() => updateTime(selectedTime.hour, minute, selectedTime.amPm)} style={[styles.choice, selectedTime.minute === minute && styles.choiceSelected]}>
                      <ThemedText style={[styles.choiceText, selectedTime.minute === minute && styles.choiceTextSelected]}>{String(minute).padStart(2, '0')}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.timeColumn}>
                <ThemedText style={styles.columnLabel}>AM/PM</ThemedText>
                <View style={styles.choiceGrid}>
                  {(['AM', 'PM'] as AmPm[]).map((amPm) => (
                    <Pressable key={amPm} onPress={() => updateTime(selectedTime.hour, selectedTime.minute, amPm)} style={[styles.choice, selectedTime.amPm === amPm && styles.choiceSelected]}>
                      <ThemedText style={[styles.choiceText, selectedTime.amPm === amPm && styles.choiceTextSelected]}>{amPm}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.utilityRow}>
              <Pressable onPress={setNow}><ThemedText style={styles.utilityText}>Use current time</ThemedText></Pressable>
              {!showEndPicker ? (
                <Pressable onPress={() => { setShowEndPicker(true); setSection('end'); }}><ThemedText style={styles.utilityText}>+ Add end time</ThemedText></Pressable>
              ) : (
                <Pressable onPress={clearEnd}><ThemedText style={styles.utilityText}>Clear end</ThemedText></Pressable>
              )}
            </View>
            {validationError ? <ThemedText style={styles.errorText}>{validationError}</ThemedText> : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={onClose} style={styles.cancelButton}><ThemedText style={styles.cancelText}>Cancel</ThemedText></Pressable>
            <Pressable onPress={handleApply} style={styles.applyButton}><ThemedText style={styles.applyText}>Apply</ThemedText></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(19, 43, 70, 0.35)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '94%', paddingTop: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 22, paddingBottom: 12 },
  eyebrow: { color: '#087AC5', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#111A30', fontSize: 24, marginTop: 4 },
  close: { color: '#71829C', fontSize: 30, lineHeight: 28 },
  content: { paddingHorizontal: 18, paddingBottom: 14 },
  sectionTabs: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  sectionTab: { flex: 1, borderWidth: 1, borderColor: '#DCE5EF', borderRadius: 12, padding: 11 },
  sectionTabActive: { borderColor: '#087AC5', backgroundColor: '#F2F8FE' },
  sectionTabText: { color: '#45617F', fontSize: 14, fontWeight: '700' },
  sectionTabTextActive: { color: '#087AC5' },
  summary: { color: '#71829C', fontSize: 10, marginTop: 4 },
  calendarCard: { borderWidth: 1, borderColor: '#E3EAF2', borderRadius: 16, overflow: 'hidden' },
  timeLabel: { color: '#16213A', fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  timeSelector: { flexDirection: 'row', gap: 8 },
  timeColumn: { flex: 1 },
  columnLabel: { color: '#8CA0B8', fontSize: 9, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'center' },
  choice: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F8FC', borderRadius: 8, minWidth: 35, minHeight: 36, paddingHorizontal: 5 },
  choiceSelected: { backgroundColor: '#087AC5' },
  choiceText: { color: '#45617F', fontSize: 12, fontWeight: '600' },
  choiceTextSelected: { color: '#FFFFFF' },
  utilityRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  utilityText: { color: '#087AC5', fontSize: 12, fontWeight: '600' },
  errorText: { color: '#C0392B', fontSize: 12, marginTop: 10 },
  footer: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#E8EEF6', padding: 18 },
  cancelButton: { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 46 },
  cancelText: { color: '#56708E', fontSize: 14, fontWeight: '600' },
  applyButton: { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 46, borderRadius: 11, backgroundColor: '#087AC5' },
  applyText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
