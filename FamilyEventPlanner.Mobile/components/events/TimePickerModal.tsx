import React, { useState, useRef } from 'react';
import { Modal, View, StyleSheet, Text, Pressable, ScrollView, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ThemedText } from '../themed-text';
import { PillButton } from '../ui/pill-button';

interface Props {
  visible: boolean;
  initialHour: number;
  initialMinute: number;
  initialAmPm: 'AM' | 'PM';
  onCancel: () => void;
  onDone: (hour: number, minute: number, ampm: 'AM' | 'PM') => void;
}

const hours = [1,2,3,4,5,6,7,8,9,10,11,12];
const minutes = [0,15,30,45];

const TimePickerModal: React.FC<Props> = ({ visible, initialHour, initialMinute, initialAmPm, onCancel, onDone }) => {
  const [hour, setHour] = useState<number>(initialHour ?? 12);
  const [minute, setMinute] = useState<number>(initialMinute ?? 0);
  const [ampm, setAmPm] = useState<'AM'|'PM'>(initialAmPm ?? 'PM');

  const hourRef = useRef<ScrollView | null>(null);
  const minuteRef = useRef<ScrollView | null>(null);
  const apRef = useRef<ScrollView | null>(null);

  const ITEM_HEIGHT = 48;

  // reset when opened
  React.useEffect(() => {
    if (visible) {
      setHour(initialHour ?? 12);
      setMinute(initialMinute ?? 0);
      setAmPm(initialAmPm ?? 'PM');
      setTimeout(() => {
        const hIndex = hours.indexOf(initialHour ?? 12);
        const mIndex = minutes.indexOf(initialMinute ?? 0);
        const apIndex = (initialAmPm ?? 'PM') === 'AM' ? 0 : 1;
        hourRef.current?.scrollTo({ y: Math.max(0, hIndex) * ITEM_HEIGHT, animated: false });
        minuteRef.current?.scrollTo({ y: Math.max(0, mIndex) * ITEM_HEIGHT, animated: false });
        apRef.current?.scrollTo({ y: apIndex * ITEM_HEIGHT, animated: false });
      }, 50);
    }
  }, [visible, initialHour, initialMinute, initialAmPm]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Pressable onPress={onCancel}><ThemedText style={styles.cancel}>Cancel</ThemedText></Pressable>
            <ThemedText type="title" style={styles.title}>Select Time</ThemedText>
            <Pressable onPress={() => onDone(hour, minute, ampm)}><ThemedText style={styles.done}>Done</ThemedText></Pressable>
          </View>

          <View style={styles.wheelRow}>
            <View style={styles.wheelColumn}>
              <ThemedText style={styles.sectionLabel}>Hour</ThemedText>
              <ScrollView ref={hourRef} onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                const clamped = Math.max(0, Math.min(hours.length - 1, idx));
                setHour(hours[clamped]);
                hourRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
              }} showsVerticalScrollIndicator={false} style={styles.wheel}>
                {hours.map((h) => (
                  <Pressable key={`wheel-h-${h}`} onPress={() => { setHour(h); hourRef.current?.scrollTo({ y: hours.indexOf(h) * ITEM_HEIGHT, animated: true }); }} style={[styles.wheelItem, hour===h && styles.wheelItemActive]}>
                    <ThemedText style={[{ color: hour===h ? '#fff' : '#b7bfcc' }]}>{String(h)}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.wheelColumn}>
              <ThemedText style={styles.sectionLabel}>Minute</ThemedText>
              <ScrollView ref={minuteRef} onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                const clamped = Math.max(0, Math.min(minutes.length - 1, idx));
                setMinute(minutes[clamped]);
                minuteRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
              }} showsVerticalScrollIndicator={false} style={styles.wheel}>
                {minutes.map((m) => (
                  <Pressable key={`wheel-m-${m}`} onPress={() => { setMinute(m); minuteRef.current?.scrollTo({ y: minutes.indexOf(m) * ITEM_HEIGHT, animated: true }); }} style={[styles.wheelItem, minute===m && styles.wheelItemActive]}>
                    <ThemedText style={[{ color: minute===m ? '#fff' : '#b7bfcc' }]}>{m.toString().padStart(2,'0')}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.wheelColumn}>
              <ThemedText style={styles.sectionLabel}>AM/PM</ThemedText>
              <ScrollView ref={apRef} onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                const clamped = Math.max(0, Math.min(1, idx));
                setAmPm(clamped === 0 ? 'AM' : 'PM');
                apRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
              }} showsVerticalScrollIndicator={false} style={styles.wheel}>
                {(['AM','PM'] as const).map((ap) => (
                  <Pressable key={`wheel-ap-${ap}`} onPress={() => { setAmPm(ap); apRef.current?.scrollTo({ y: (ap==='AM'?0:1) * ITEM_HEIGHT, animated: true }); }} style={[styles.wheelItem, ampm===ap && styles.wheelItemActive]}>
                    <ThemedText style={[{ color: ampm===ap ? '#fff' : '#b7bfcc' }]}>{ap}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
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
  card: {
    width: '92%',
    maxHeight: '80%',
    backgroundColor: '#23232b',
    borderRadius: 16,
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { color: '#fff' },
  cancel: { color: '#aeb7c9' },
  done: { color: '#4f8cff' },
  sectionLabel: { color: '#b7bfcc', marginTop: 8, marginBottom: 6 },
  wheelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  wheelColumn: { width: '30%' },
  wheel: { height: 48 * 4 },
  wheelItem: { height: 48, justifyContent: 'center', alignItems: 'center' },
  wheelItemActive: {  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '30%', marginBottom: 8 },
  row: { flexDirection: 'row', marginBottom: 8 },
});

export default TimePickerModal;
