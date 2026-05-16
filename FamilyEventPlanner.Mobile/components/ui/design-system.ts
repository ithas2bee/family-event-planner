/**
 * Immersive UI Design System
 * Dark cinematic theme with consistent spacing, typography, and interaction patterns
 */

// Color palette
export const Colors = {
  // Backgrounds
  screen: '#101018',
  card: 'rgba(30,30,40,0.92)',
  input: '#18181f',
  modal: '#23232b',

  // Text
  text: {
    primary: '#ffffff',
    secondary: '#e0e0e0',
    muted: '#8e95a3',
  },

  // Interactive
  primary: '#0A7EA4',
  secondary: 'rgba(255,255,255,0.08)',
  muted: 'rgba(255,255,255,0.04)',

  // Accents
  success: '#4caf50',
  error: '#C0392B',
  warning: '#ff9800',

  // Gradients & Effects
  glowBlue: 'rgba(93, 119, 255, 0.28)',
  glowTeal: 'rgba(33, 188, 166, 0.18)',
};

// Spacing system (4px base unit)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
};

// Border radius
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  hero: 32,
};

// Shadow (elevation)
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
};

// Typography
export const Typography = {
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    hero: 28,
    display: 32,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};
