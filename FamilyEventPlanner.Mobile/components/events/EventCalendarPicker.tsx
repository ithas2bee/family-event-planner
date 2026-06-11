import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

interface Props {
  value?: Date | null;
  onChange: (date: Date) => void;
}

export const EventCalendarPicker: React.FC<Props> = ({ value, onChange }) => {
  const marked = useMemo(() => {
    if (!value) return {};
    const iso = value.toISOString().slice(0, 10);
    return { [iso]: { selected: true, selectedColor: '#4f8cff' } };
  }, [value]);

  function handleDayPress(day: DateData) {
    // Preserve time from existing value if present, otherwise use current time
    const current = value ?? new Date();
    const [year, month, dayNum] = day.dateString.split('-').map(Number);
    const newDate = new Date(
      year,
      month - 1,
      dayNum,
      current.getHours(),
      current.getMinutes(),
      current.getSeconds(),
      current.getMilliseconds()
    );
    onChange(newDate);
  }

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={handleDayPress}
        markedDates={marked}
        enableSwipeMonths
        // keep default styling; parent app design system controls card container
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
});

export default EventCalendarPicker;