import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '../themed-text';

interface EventDetailsCardProps {
  title: string;
  date: string;
  location: string;
  onPressDate: () => void;
  onPressLocation: () => void;
  onPressSettings: () => void;
}

export const EventDetailsCard: React.FC<EventDetailsCardProps> = ({
  title,
  date,
  location,
  onPressDate,
  onPressLocation,
  onPressSettings,
}) => {
  return (
    <View style={styles.card}>
      <ThemedText type="defaultSemiBold" style={styles.label}>Event Title</ThemedText>
      <ThemedText style={styles.value}>{title}</ThemedText>

      <Pressable style={styles.row} onPress={onPressDate}>
        <ThemedText type="defaultSemiBold" style={styles.label}>Date & Time</ThemedText>
        <ThemedText style={styles.value}>{date || 'Select date & time'}</ThemedText>
      </Pressable>

      <Pressable style={styles.row} onPress={onPressLocation}>
        <ThemedText type="defaultSemiBold" style={styles.label}>Location</ThemedText>
        <ThemedText style={styles.value}>{location || 'Add location'}</ThemedText>
      </Pressable>

      <Pressable style={styles.settingsButton} onPress={onPressSettings}>
        <ThemedText style={styles.settingsText}>Advanced Settings</ThemedText>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(30,30,40,0.92)',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginTop: -40,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  label: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 2,
  },
  value: {
    color: '#fff',
    fontSize: 17,
    marginBottom: 12,
  },
  row: {
    marginTop: 8,
    marginBottom: 8,
  },
  settingsButton: {
    marginTop: 16,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  settingsText: {
    color: '#fff',
    fontSize: 15,
  },
});
