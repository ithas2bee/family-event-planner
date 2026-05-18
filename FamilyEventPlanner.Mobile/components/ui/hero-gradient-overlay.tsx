import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors, Radius } from './design-system';

interface HeroGradientOverlayProps {
  height?: number;
  glowScale?: number;
  children?: React.ReactNode;
}

/**
 * Reusable hero section with gradient overlay and glow effects
 */
export const HeroGradientOverlay: React.FC<HeroGradientOverlayProps> = ({
  height = 220,
  glowScale = 1,
  children,
}) => {
  const topLeftSize = 220 * glowScale;
  const bottomRightSize = 260 * glowScale;

  return (
    <View style={[styles.hero, { height }]}>
      {/* Base gradient background */}
      <View style={styles.baseGradient} />

      {/* Glow effects */}
      <View
        style={[
          styles.glowTopLeft,
          {
            width: topLeftSize,
            height: topLeftSize,
            borderRadius: topLeftSize / 2,
          },
        ]}
      />
      <View
        style={[
          styles.glowBottomRight,
          {
            width: bottomRightSize,
            height: bottomRightSize,
            borderRadius: bottomRightSize / 2,
          },
        ]}
      />

      {/* Content overlay */}
      <View style={styles.overlay}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    justifyContent: 'flex-end',
    borderBottomLeftRadius: Radius.hero,
    borderBottomRightRadius: Radius.hero,
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
    backgroundColor: Colors.glowBlue,
  },
  glowBottomRight: {
    position: 'absolute',
    right: -55,
    bottom: -80,
    backgroundColor: Colors.glowTeal,
  },
  overlay: {
    backgroundColor: 'rgba(20,20,30,0.55)',
    borderBottomLeftRadius: Radius.hero,
    borderBottomRightRadius: Radius.hero,
  },
});
