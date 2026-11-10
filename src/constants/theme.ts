import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#14181F',
    background: '#F4F5F7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E5E8EC',
    textSecondary: '#5B6470',
    primary: '#D97706',
    onPrimary: '#1A1100',
    primarySoft: '#FDF0DB',
    success: '#15803D',
    successSoft: '#DCF5E4',
    warning: '#B45309',
    warningSoft: '#FDEBCB',
    danger: '#C62828',
    dangerSoft: '#FBE1E1',
  },
  dark: {
    text: '#F3F5F8',
    background: '#0B0D10',
    backgroundElement: '#151920',
    backgroundSelected: '#262C35',
    textSecondary: '#9BA5B2',
    primary: '#FBBF24',
    onPrimary: '#1A1100',
    primarySoft: '#2C2410',
    success: '#4ADE80',
    successSoft: '#12301D',
    warning: '#FBBF24',
    warningSoft: '#33290F',
    danger: '#F87171',
    dangerSoft: '#3A1818',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Typography = {
  fontFamily: Fonts,
  fontSize: {
    code: 12,
    small: 14,
    body: 16,
    title: 32,
    display: 48,
  },
  lineHeight: {
    small: 20,
    body: 24,
    link: 30,
    title: 44,
    display: 52,
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BorderRadius = {
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 24,
  doubleExtraLarge: 32,
  icon: 40,
  pill: 9999,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
