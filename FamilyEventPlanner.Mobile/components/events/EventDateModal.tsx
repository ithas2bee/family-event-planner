import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, DateData } from 'react-native-calendars';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.calendarIcon}>
              <MaterialIcons name="event" size={28} color="#1678E8" />
            </View>
            <View>
              <ThemedText type="title" style={styles.title}>Select Date & Time</ThemedText>
              <ThemedText style={styles.subtitle}>Choose when your event will take place.</ThemedText>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close date and time picker">
              <MaterialIcons name="close" size={30} color="#62708D" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {showEndPicker && <View style={styles.sectionTabs}>
              <Pressable style={[styles.sectionTab, section === 'start' && styles.sectionTabActive]} onPress={() => setSection('start')}>
                <ThemedText style={[styles.sectionTabText, section === 'start' && styles.sectionTabTextActive]}>Start</ThemedText>
                <ThemedText style={styles.summary}>{formatDate(selectedStart)} · {formatTime(selectedStart ? withTime(selectedStart, startTime.hour, startTime.minute, startTime.amPm) : null)}</ThemedText>
              </Pressable>
              <Pressable style={[styles.sectionTab, section === 'end' && styles.sectionTabActive]} onPress={() => showEndPicker && setSection('end')}>
                <ThemedText style={[styles.sectionTabText, section === 'end' && styles.sectionTabTextActive]}>End</ThemedText>
                <ThemedText style={styles.summary}>{showEndPicker ? `${formatDate(selectedEnd)} · ${formatTime(selectedEnd ? withTime(selectedEnd, endTime.hour, endTime.minute, endTime.amPm) : null)}` : 'Optional'}</ThemedText>
              </Pressable>
            </View>}

            <View style={styles.pickerColumns}>
              <View style={styles.dateColumn}>
                <ThemedText style={styles.panelTitle}>{showEndPicker ? (section === 'start' ? 'Select Start Date' : 'Select End Date') : 'Select Date'}</ThemedText>
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
            </View>

              <View style={styles.timeColumnLarge}>
                <ThemedText style={styles.panelTitle}>Select Time</ThemedText>
                <ThemedText style={styles.timeLabel}>Time</ThemedText>
                <View style={styles.timeInputs}>
                  <Pressable style={styles.timeInput} onPress={() => updateTime(selectedTime.hour === 12 ? 1 : selectedTime.hour + 1, selectedTime.minute, selectedTime.amPm)}>
                    <ThemedText style={styles.timeValue}>{selectedTime.hour}</ThemedText>
                    <MaterialIcons name="keyboard-arrow-down" size={23} color="#62708D" />
                  </Pressable>
                  <ThemedText style={styles.colon}>:</ThemedText>
                  <Pressable style={styles.timeInput} onPress={() => updateTime(selectedTime.hour, minutes[(minutes.indexOf(selectedTime.minute) + 1) % minutes.length], selectedTime.amPm)}>
                    <ThemedText style={styles.timeValue}>{String(selectedTime.minute).padStart(2, '0')}</ThemedText>
                    <MaterialIcons name="keyboard-arrow-down" size={23} color="#62708D" />
                  </Pressable>
                </View>
                <ThemedText style={styles.timeLabel}>AM/PM</ThemedText>
                <View style={styles.ampmToggle}>
                  {(['AM', 'PM'] as AmPm[]).map((amPm) => (
                    <Pressable key={amPm} onPress={() => updateTime(selectedTime.hour, selectedTime.minute, amPm)} style={[styles.ampmOption, selectedTime.amPm === amPm && styles.ampmSelected]}>
                      <ThemedText style={[styles.ampmText, selectedTime.amPm === amPm && styles.ampmTextSelected]}>{amPm}</ThemedText>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.quickTimes}>
                  <ThemedText style={styles.quickTitle}>Quick Times</ThemedText>
                  <View style={styles.quickGrid}>
                    {[['9:00 AM', 9, 0, 'AM'], ['12:00 PM', 12, 0, 'PM'], ['3:00 PM', 3, 0, 'PM'], ['6:00 PM', 6, 0, 'PM']].map(([label, hour, minute, amPm]) => (
                      <Pressable key={String(label)} style={styles.quickButton} onPress={() => updateTime(Number(hour), Number(minute), amPm as AmPm)}>
                        <ThemedText style={styles.quickText}>{label}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
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
            <View style={styles.selectedSummary}>
              <View style={styles.summaryIcon}><MaterialIcons name="event" size={24} color="#1678E8" /></View>
              <View>
                <ThemedText style={styles.selectedLabel}>Selected Date & Time</ThemedText>
                <ThemedText style={styles.selectedValue}>{formatDate(activeDate)} at {formatTime(activeDate ? withTime(activeDate, selectedTime.hour, selectedTime.minute, selectedTime.amPm) : null)}</ThemedText>
              </View>
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
  modal: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '96%', paddingTop: 16 },
  handle: { alignSelf: 'center', width: 78, height: 7, borderRadius: 4, backgroundColor: '#BAC6DC', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingBottom: 16 },
  calendarIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E6F0FF' },
  title: { color: '#111A30', fontSize: 24 },
  subtitle: { color: '#71829C', fontSize: 14, marginTop: 3 },
  content: { paddingHorizontal: 18, paddingBottom: 14 },
  sectionTabs: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  sectionTab: { flex: 1, borderWidth: 1, borderColor: '#DCE5EF', borderRadius: 12, padding: 11 },
  sectionTabActive: { borderColor: '#087AC5', backgroundColor: '#F2F8FE' },
  sectionTabText: { color: '#45617F', fontSize: 14, fontWeight: '700' },
  sectionTabTextActive: { color: '#087AC5' },
  summary: { color: '#71829C', fontSize: 10, marginTop: 4 },
  pickerColumns: { flexDirection: 'row', gap: 12 },
  dateColumn: { flex: 1.45 },
  timeColumnLarge: { flex: 1 },
  panelTitle: { color: '#111A30', fontSize: 18, fontWeight: '700', marginBottom: 14 },
  calendarCard: { borderWidth: 1, borderColor: '#DCE5EF', borderRadius: 16, overflow: 'hidden' },
  timeLabel: { color: '#17213D', fontSize: 13, fontWeight: '600', marginTop: 11, marginBottom: 7 },
  timeInputs: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeInput: { flex: 1, minHeight: 64, borderWidth: 1, borderColor: '#DCE5EF', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  timeValue: { color: '#17213D', fontSize: 21, fontWeight: '600' },
  colon: { color: '#17213D', fontSize: 20 },
  ampmToggle: { flexDirection: 'row', backgroundColor: '#F1F6FD', borderRadius: 20, padding: 3 },
  ampmOption: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 17 },
  ampmSelected: { backgroundColor: '#1678E8' },
  ampmText: { color: '#62708D', fontSize: 14, fontWeight: '700' },
  ampmTextSelected: { color: '#FFFFFF' },
  quickTimes: { backgroundColor: '#F4F8FE', borderRadius: 15, padding: 12, marginTop: 17 },
  quickTitle: { color: '#17213D', fontSize: 13, fontWeight: '700', marginBottom: 9 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  quickButton: { width: '47%', borderWidth: 1, borderColor: '#D5E1F1', borderRadius: 17, paddingVertical: 9, alignItems: 'center' },
  quickText: { color: '#62708D', fontSize: 11, fontWeight: '600' },
  utilityRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  utilityText: { color: '#087AC5', fontSize: 12, fontWeight: '600' },
  errorText: { color: '#C0392B', fontSize: 12, marginTop: 10 },
  selectedSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F2F7FE', borderRadius: 16, padding: 14, marginTop: 15 },
  summaryIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E0EDFF' },
  selectedLabel: { color: '#62708D', fontSize: 12 },
  selectedValue: { color: '#111A30', fontSize: 14, fontWeight: '700', marginTop: 4 },
  footer: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#E8EEF6', padding: 18 },
  cancelButton: { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 46 },
  cancelText: { color: '#56708E', fontSize: 14, fontWeight: '600' },
  applyButton: { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 46, borderRadius: 11, backgroundColor: '#087AC5' },
  applyText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
