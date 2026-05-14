import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '../themed-text';

interface EventHeroSectionProps {
  title: string;
  children?: React.ReactNode;
}

export const EventHeroSection: React.FC<EventHeroSectionProps> = ({ title, children }) => {
  return (
    <View style={styles.hero}>
      <View style={styles.baseGradient} />
      <View style={styles.glowTopLeft} />
      <View style={styles.glowBottomRight} />
      <View style={styles.overlay}>
        <ThemedText type="title" style={styles.title}>{title}</ThemedText>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    height: 220,
    justifyContent: 'flex-end',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#131722',
  },
  baseGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1B2433',
  },
  glowTopLeft: {
    position: 'absolute',
    top: -70,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(93, 119, 255, 0.28)',
  },
  glowBottomRight: {
    position: 'absolute',
    right: -55,
    bottom: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(33, 188, 166, 0.18)',
  },
  overlay: {
    backgroundColor: 'rgba(20,20,30,0.55)',
    padding: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
});
