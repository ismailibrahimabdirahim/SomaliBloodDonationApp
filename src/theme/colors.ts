import { useColorScheme } from 'react-native';

export const palette = {
  bloodRed: '#D32F2F',
  white: '#FFFFFF',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
  blackOverlay: 'rgba(0,0,0,0.5)',
  blackOverlay60: 'rgba(0,0,0,0.6)',
  red50: '#FEF2F2',
  red100: '#FFE4E6',
  red500: '#EF4444',
  amber50: '#FFFBEB',
  amber200: '#FDE68A',
  amber700: '#B45309',
  green50: '#F0FDF4',
  green500: '#22C55E',
  green600: '#16A34A',
  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  blue400: '#60A5FA',
  blue600: '#2563EB',
};

export const colors = palette; // Keep for backward compatibility during migration

import { useThemeContext } from '../context/ThemeContext';

export function useTheme() {
  let ctx;
  try {
    ctx = useThemeContext();
  } catch {
    // Fallback if context not wrapped (e.g. tests or early initialization)
    return {
      isDark: false,
      colors: {
        ...palette,
        background: palette.white,
        surface: palette.white,
        text: palette.slate900,
        textMuted: palette.slate500,
        border: palette.slate100,
        card: palette.white,
        inputBg: palette.slate50,
        tabBar: palette.white,
        safe: palette.white,
      }
    };
  }

  const { isDark } = ctx;

  return {
    isDark,
    colors: {
      ...palette,
      // Dynamic overrides
      background: isDark ? palette.slate900 : palette.white,
      surface: isDark ? palette.slate800 : palette.white,
      text: isDark ? palette.slate50 : palette.slate900,
      textMuted: isDark ? palette.slate400 : palette.slate500,
      border: isDark ? palette.slate700 : palette.slate100,
      card: isDark ? palette.slate800 : palette.white,
      inputBg: isDark ? palette.slate800 : palette.slate50,
      tabBar: isDark ? palette.slate900 : palette.white,
      safe: isDark ? palette.slate900 : palette.white,
    }
  };
}
