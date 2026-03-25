/**
 * Theme constants for consistent styling across the app
 * Updated with elegant white theme and balanced colors
 */

export const COLORS = {
  // Primary colors
  primary: '#0cadab',
  primaryDark: '#0a9a98',
  primaryLight: '#0ec0be',
  
  // Accent color
  accent: '#101720',
  accentLight: '#1f2937',
  
  // Background colors
  background: '#ffffff',
  backgroundLight: '#f8f9fa',
  backgroundCard: '#f8f9fa',
  
  // Text colors
  text: '#1f2937',
  textSecondary: '#8696a0',
  textMuted: '#6c7278',
  
  // UI colors
  border: '#e5e7eb',
  divider: '#e5e7eb',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // Status colors
  success: '#4CAF50',
  error: '#ef4444',
  warning: '#FFC107',
  info: '#2196F3',
  
  // Gradient colors
  gradientStart: '#0cadab',
  gradientEnd: '#0a9a98',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const FONT_WEIGHTS = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const ANIMATION = {
  fast: 200,
  normal: 300,
  slow: 500,
};