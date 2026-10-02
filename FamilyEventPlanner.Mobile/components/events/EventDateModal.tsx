import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, DateData } from 'react-native-calendars';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '../themed-text';

interface EventDateModalProps {
  visible: boolean;
  date: Date | null;
  endDate: Date | null;
  onChange: (date: Date | null, endDate: Date | null) => void;
  onClose: () => void;
}

type AmPm = 'AM' | 'PM';
type TimePart = number | AmPm;

interface TimeParts {
  hour: number;
  minute: number;
  amPm: AmPm;
}

const hours = Array.from({ length: 12 }, (_, index) => index + 1);
const minutes = Array.from({ length: 60 }, (_, index) => index);
const periods: AmPm[] = ['AM', 'PM'];
const quickTimes: { label: string; hour: number; amPm: AmPm }[] = [
  { label: '9:00 AM', hour: 9, amPm: 'AM' },
  { label: '12:00 PM', hour: 12, amPm: 'PM' },
  { label: '3:00 PM', hour: 3, amPm: 'PM' },
  { label: '6:00 PM', hour: 6, amPm: 'PM' },
];

const WHEEL_ITEM_HEIGHT = 40;
const WHEEL_VISIBLE_ITEMS = 5;
const WHEEL_PADDING = (WHEEL_VISIBLE_ITEMS - 1) / 2;

function getTimeParts(value: Date | null): TimeParts {
  if (!value) return { hour: 12, minute: 0, amPm: 'PM' };
  const hour = value.getHours();
  return {
    hour: ((hour + 11) % 12) + 1,
    minute: value.getMinutes(),
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

function withCalendarDate(day: DateData, value: Date) {
  const [year, month, dayNumber] = day.dateString.split('-').map(Number);
  return new Date(year, month - 1, dayNumber, value.getHours(), value.getMinutes(), 0, 0);
}

function calendarDayOffset(start: Date, end: Date) {
  const startDay = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endDay - startDay) / 86_400_000);
}

function withDayOffset(start: Date, end: Date, offset: number) {
  const result = new Date(start);
  result.setDate(result.getDate() + offset);
  result.setHours(end.getHours(), end.getMinutes(), 0, 0);
  return result;
}

function formatDate(value: Date | null) {
  return value?.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) ?? 'Select date';
}

function formatTime(value: Date | null) {
  return value?.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) ?? 'Select time';
}

interface TimeWheelProps {
  label: string;
  values: TimePart[];
  value: TimePart;
  onChange: (value: TimePart) => void;
}

const TimeWheel: React.FC<TimeWheelProps> = ({ label, values, value, onChange }) => {
  const scrollRef = useRef<ScrollView>(null);
  const lastScrolledValue = useRef<TimePart | null>(null);
  const selectedIndex = values.indexOf(value);

  useEffect(() => {
    if (selectedIndex >= 0) {
      if (lastScrolledValue.current === value) {
        lastScrolledValue.current = null;
        return;
      }
      scrollRef.current?.scrollTo({ y: selectedIndex * WHEEL_ITEM_HEIGHT, animated: false });
    }
  }, [selectedIndex, value]);

  function selectAtOffset(event: NativeSyntheticEvent<NativeScrollEvent>, snap = true) {
    const index = Math.max(
      0,
      Math.min(values.length - 1, Math.round(event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT)),
    );
    lastScrolledValue.current = values[index];
    onChange(values[index]);
    if (snap) scrollRef.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated: true });
  }

  return (
    <View style={styles.wheelColumn}>
      <ThemedText style={styles.wheelLabel}>{label}</ThemedText>
      <ScrollView
        ref={scrollRef}
        nestedScrollEnabled
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={selectAtOffset}
        onScrollEndDrag={(event) => selectAtOffset(event, false)}
        showsVerticalScrollIndicator={false}
        style={styles.wheel}
        contentContainerStyle={styles.wheelContent}
      >
        {values.map((item, index) => (
          <View
            key={`${label}-${item}`}
            style={[styles.wheelItem, index === selectedIndex && styles.wheelItemSelected]}
          >
            <ThemedText style={[styles.wheelValue, index === selectedIndex && styles.wheelValueSelected]}>
              {label === 'Minute' ? String(item).padStart(2, '0') : item}
            </ThemedText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

interface StepHeadingProps {
  number: number;
  title: string;
  subtitle?: string;
}

const StepHeading: React.FC<StepHeadingProps> = ({ number, title, subtitle }) => (
  <View style={styles.stepHeading}>
    <View style={styles.stepNumber}>
      <ThemedText style={styles.stepNumberText}>{number}</ThemedText>
    </View>
    <View style={styles.stepTitleContainer}>
      <ThemedText style={styles.stepTitle}>{title}</ThemedText>
      {subtitle ? <ThemedText style={styles.stepSubtitle}>{subtitle}</ThemedText> : null}
    </View>
  </View>
);

const EventDateModalContent: React.FC<EventDateModalProps> = ({ visible, date, endDate, onChange, onClose }) => {
  const [selectedStart, setSelectedStart] = useState<Date | null>(date);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(endDate);
  const [startTime, setStartTime] = useState(getTimeParts(date));
  const [endTime, setEndTime] = useState(getTimeParts(endDate));
  const [showEndPicker, setShowEndPicker] = useState(endDate !== null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const markedDates = useMemo(() => {
    if (!selectedStart) return {};
    const year = selectedStart.getFullYear();
    const month = String(selectedStart.getMonth() + 1).padStart(2, '0');
    const day = String(selectedStart.getDate()).padStart(2, '0');
    return { [`${year}-${month}-${day}`]: { selected: true, selectedColor: '#087AC5' } };
  }, [selectedStart]);

  function handleDayPress(day: DateData) {
    const nextStart = withCalendarDate(day, selectedStart ?? new Date());
    setSelectedStart(nextStart);
    if (selectedEnd && selectedStart) {
      setSelectedEnd(withDayOffset(nextStart, selectedEnd, calendarDayOffset(selectedStart, selectedEnd)));
    } else if (showEndPicker) {
      const nextEnd = new Date(withTime(nextStart, startTime.hour, startTime.minute, startTime.amPm).getTime() + 60 * 60 * 1000);
      setEndTime(getTimeParts(nextEnd));
      setSelectedEnd(nextEnd);
    }
    setValidationError(null);
  }

  function setNow() {
    const now = new Date();
    setSelectedStart(now);
    setStartTime(getTimeParts(now));
    setSelectedEnd((currentEnd) => currentEnd ? withDayOffset(now, currentEnd, selectedStart ? calendarDayOffset(selectedStart, currentEnd) : 0) : currentEnd);
    setValidationError(null);
  }

  function addEndTime() {
    setShowEndPicker(true);
    if (selectedStart) {
      const nextEnd = new Date(withTime(selectedStart, startTime.hour, startTime.minute, startTime.amPm).getTime() + 60 * 60 * 1000);
      setSelectedEnd(nextEnd);
      setEndTime(getTimeParts(nextEnd));
    }
  }

  function clearEndTime() {
    setSelectedEnd(null);
    setShowEndPicker(false);
    setValidationError(null);
  }

  function handleApply() {
    const builtStart = selectedStart
      ? withTime(selectedStart, startTime.hour, startTime.minute, startTime.amPm)
      : null;
    const builtEnd = showEndPicker && selectedEnd
      ? withTime(selectedEnd, endTime.hour, endTime.minute, endTime.amPm)
      : null;
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

  const selectedQuickTime = quickTimes.find(
    (quickTime) => quickTime.hour === startTime.hour && quickTime.amPm === startTime.amPm && startTime.minute === 0,
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.calendarIcon}>
              <MaterialIcons name="event" size={28} color="#1678E8" />
            </View>
            <View style={styles.headerText}>
              <ThemedText type="title" style={styles.title}>Select Date &amp; Time</ThemedText>
              <ThemedText style={styles.subtitle}>Choose when your event will take place.</ThemedText>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close date and time picker">
              <MaterialIcons name="close" size={30} color="#62708D" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.sectionCard}>
              <StepHeading number={1} title="Select Date" />
              <View style={styles.calendarCard}>
                <Calendar
                  current={selectedStart
                    ? `${selectedStart.getFullYear()}-${String(selectedStart.getMonth() + 1).padStart(2, '0')}-${String(selectedStart.getDate()).padStart(2, '0')}`
                    : undefined}
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

            <View style={styles.sectionCard}>
              <StepHeading number={2} title="Quick Times (Optional)" subtitle="Pick a common time to save time." />
              <View style={styles.quickGrid}>
                {quickTimes.map((quickTime) => {
                  const isSelected = selectedQuickTime === quickTime;
                  return (
                    <Pressable
                      key={quickTime.label}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      style={[styles.quickButton, isSelected && styles.quickButtonSelected]}
                      onPress={() => {
                        setStartTime({ hour: quickTime.hour, minute: 0, amPm: quickTime.amPm });
                        setValidationError(null);
                      }}
                    >
                      <ThemedText style={[styles.quickText, isSelected && styles.quickTextSelected]}>
                        {quickTime.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionCard}>
              <StepHeading number={3} title="Select Start Time" subtitle="Choose when the event will start." />
              <View style={styles.wheels}>
                <TimeWheel label="Hour" values={hours} value={startTime.hour} onChange={(hour) => setStartTime((time) => ({ ...time, hour: Number(hour) }))} />
                <TimeWheel label="Minute" values={minutes} value={startTime.minute} onChange={(minute) => setStartTime((time) => ({ ...time, minute: Number(minute) }))} />
                <TimeWheel label="AM/PM" values={periods} value={startTime.amPm} onChange={(amPm) => setStartTime((time) => ({ ...time, amPm: amPm as AmPm }))} />
              </View>
              <Pressable onPress={setNow} style={styles.currentTimeButton}>
                <ThemedText style={styles.currentTimeText}>Use current time</ThemedText>
              </Pressable>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.endHeading}>
                <StepHeading number={4} title="Select End Time" subtitle="Choose when the event will end." />
                {showEndPicker ? (
                  <Pressable onPress={clearEndTime} accessibilityRole="button">
                    <ThemedText style={styles.endAction}>Clear</ThemedText>
                  </Pressable>
                ) : null}
              </View>
              {showEndPicker ? (
                <View style={styles.wheels}>
                  <TimeWheel label="Hour" values={hours} value={endTime.hour} onChange={(hour) => setEndTime((time) => ({ ...time, hour: Number(hour) }))} />
                  <TimeWheel label="Minute" values={minutes} value={endTime.minute} onChange={(minute) => setEndTime((time) => ({ ...time, minute: Number(minute) }))} />
                  <TimeWheel label="AM/PM" values={periods} value={endTime.amPm} onChange={(amPm) => setEndTime((time) => ({ ...time, amPm: amPm as AmPm }))} />
                </View>
              ) : (
                <Pressable onPress={addEndTime} style={styles.addEndButton} accessibilityRole="button">
                  <ThemedText style={styles.addEndText}>+ Add an end time (optional)</ThemedText>
                </Pressable>
              )}
            </View>

            <View style={styles.selectedSummary}>
              <View style={styles.summaryIcon}><MaterialIcons name="event" size={24} color="#1678E8" /></View>
              <View style={styles.summaryText}>
                <ThemedText style={styles.selectedLabel}>Selected Date &amp; Time</ThemedText>
                <ThemedText style={styles.selectedValue}>
                  {formatDate(selectedStart)} at {formatTime(selectedStart ? withTime(selectedStart, startTime.hour, startTime.minute, startTime.amPm) : null)}
                  {showEndPicker && selectedEnd ? ` – ${formatTime(withTime(selectedEnd, endTime.hour, endTime.minute, endTime.amPm))}` : ''}
                </ThemedText>
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

export const EventDateModal: React.FC<EventDateModalProps> = (props) => (
  <EventDateModalContent
    key={`${props.visible}:${props.date?.getTime() ?? ''}:${props.endDate?.getTime() ?? ''}`}
    {...props}
  />
);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(19, 43, 70, 0.35)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '96%', paddingTop: 12 },
  handle: { alignSelf: 'center', width: 78, height: 7, borderRadius: 4, backgroundColor: '#BAC6DC', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12 },
  calendarIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E6F0FF' },
  headerText: { flex: 1 },
  title: { color: '#111A30', fontSize: 22, lineHeight: 27 },
  subtitle: { color: '#71829C', fontSize: 13, marginTop: 2 },
  content: { paddingHorizontal: 16, paddingBottom: 12 },
  sectionCard: { borderWidth: 1, borderColor: '#E1EAF5', borderRadius: 20, padding: 14, marginBottom: 12 },
  stepHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  stepNumber: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E1EEFF', alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#1678E8', fontSize: 16, fontWeight: '700' },
  stepTitleContainer: { flex: 1 },
  stepTitle: { color: '#111A30', fontSize: 17, fontWeight: '700' },
  stepSubtitle: { color: '#71829C', fontSize: 13, marginTop: 2 },
  calendarCard: { borderWidth: 1, borderColor: '#E1EAF5', borderRadius: 18, overflow: 'hidden' },
  quickGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  quickButton: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: '#DCE8F8', borderRadius: 18, backgroundColor: '#F4F8FE', alignItems: 'center', justifyContent: 'center' },
  quickButtonSelected: { borderColor: '#1678E8', backgroundColor: '#E6F1FF' },
  quickText: { color: '#17213D', fontSize: 12, fontWeight: '600' },
  quickTextSelected: { color: '#087AC5' },
  wheels: { flexDirection: 'row', backgroundColor: '#F7FAFE', borderWidth: 1, borderColor: '#E1EAF5', borderRadius: 20, paddingHorizontal: 8 },
  wheelColumn: { flex: 1, alignItems: 'stretch' },
  wheelLabel: { color: '#71829C', fontSize: 11, fontWeight: '600', textAlign: 'center', paddingTop: 7, paddingBottom: 3 },
  wheel: { height: WHEEL_VISIBLE_ITEMS * WHEEL_ITEM_HEIGHT },
  wheelContent: { paddingVertical: WHEEL_PADDING * WHEEL_ITEM_HEIGHT },
  wheelItem: { height: WHEEL_ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  wheelItemSelected: { backgroundColor: '#E4F0FF' },
  wheelValue: { color: '#9AA8BC', fontSize: 16 },
  wheelValueSelected: { color: '#102758', fontSize: 18, fontWeight: '700' },
  currentTimeButton: { alignSelf: 'flex-end', marginTop: 9, paddingVertical: 3, paddingHorizontal: 2 },
  currentTimeText: { color: '#087AC5', fontSize: 12, fontWeight: '600' },
  endHeading: { flexDirection: 'row', alignItems: 'center' },
  endAction: { color: '#087AC5', fontSize: 13, fontWeight: '600', padding: 6 },
  addEndButton: { minHeight: 45, borderWidth: 1, borderColor: '#DCE8F8', borderRadius: 14, backgroundColor: '#F7FAFE', alignItems: 'center', justifyContent: 'center' },
  addEndText: { color: '#087AC5', fontSize: 14, fontWeight: '600' },
  selectedSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F2F7FE', borderRadius: 16, padding: 14, marginBottom: 4 },
  summaryIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E0EDFF' },
  summaryText: { flex: 1 },
  selectedLabel: { color: '#62708D', fontSize: 12 },
  selectedValue: { color: '#111A30', fontSize: 13, fontWeight: '700', marginTop: 4 },
  errorText: { color: '#C0392B', fontSize: 12, marginVertical: 8 },
  footer: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#E8EEF6', paddingHorizontal: 18, paddingVertical: 12 },
  cancelButton: { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 50, borderWidth: 1, borderColor: '#79B6FF', borderRadius: 14 },
  cancelText: { color: '#1678E8', fontSize: 15, fontWeight: '600' },
  applyButton: { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 50, borderRadius: 14, backgroundColor: '#087AC5' },
  applyText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
