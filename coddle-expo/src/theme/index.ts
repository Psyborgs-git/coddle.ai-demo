import { createTheme } from '@shopify/restyle';

const palette = {
  // Primary colors
  primary50: '#E6F2FF',
  primary100: '#BAE0FF',
  primary200: '#7CC4FA',
  primary300: '#47A3F3',
  primary400: '#2186EB',
  primary500: '#0967D2',
  primary600: '#0552B5',
  primary700: '#03449E',
  primary800: '#01337D',
  primary900: '#002159',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F7FAFC',
  gray100: '#EDF2F7',
  gray200: '#E2E8F0',
  gray300: '#CBD5E0',
  gray400: '#A0AEC0',
  gray500: '#718096',
  gray600: '#4A5568',
  gray700: '#2D3748',
  gray800: '#1A202C',
  gray900: '#171923',

  // Semantic colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Sleep-specific colors
  sleepPurple: '#9333EA',
  sleepBlue: '#3B82F6',
  sleepPink: '#EC4899',
  windDownYellow: '#FBBF24',
};

const theme = createTheme({
  colors: {
    mainBackground: palette.gray50,
    cardBackground: palette.white,
    primaryText: palette.gray900,
    secondaryText: palette.gray600,
    tertiaryText: palette.gray400,
    
    primary: palette.primary500,
    primaryLight: palette.primary100,
    primaryDark: palette.primary700,
    
    success: palette.success,
    warning: palette.warning,
    error: palette.error,
    info: palette.info,
    
    border: palette.gray200,
    borderLight: palette.gray100,
    
    sleepNap: palette.sleepBlue,
    sleepBedtime: palette.sleepPurple,
    sleepWindDown: palette.windDownYellow,
    
    white: palette.white,
    black: palette.black,
    gray100: palette.gray100,
    transparent: 'transparent',
  },
  
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadii: {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
    round: 9999,
  },
  
  textVariants: {
    header: {
      fontSize: 32,
      fontWeight: 'bold',
      color: 'primaryText',
      lineHeight: 40,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: 'primaryText',
      lineHeight: 32,
    },
    subtitle: {
      fontSize: 18,
      fontWeight: '600',
      color: 'primaryText',
      lineHeight: 24,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      color: 'primaryText',
      lineHeight: 24,
    },
    // compatibility alias for components expecting a 'defaults' variant
    defaults: {
      fontSize: 16,
      fontWeight: '400',
      color: 'primaryText',
      lineHeight: 24,
    },
    caption: {
      fontSize: 14,
      fontWeight: '400',
      color: 'secondaryText',
      lineHeight: 20,
    },
    label: {
      fontSize: 12,
      fontWeight: '500',
      color: 'tertiaryText',
      lineHeight: 16,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  },
  
  cardVariants: {
    defaults: {
      backgroundColor: 'cardBackground',
      borderRadius: 'm',
      padding: 'm',
      shadowColor: 'black',
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      elevation: 3,
    },
    elevated: {
      backgroundColor: 'cardBackground',
      borderRadius: 'l',
      padding: 'l',
      shadowColor: 'black',
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 5,
    },
  },
  
  buttonVariants: {
    primary: {
      backgroundColor: 'primary',
      borderRadius: 'm',
      padding: 'm',
    },
    secondary: {
      backgroundColor: 'primaryLight',
      borderRadius: 'm',
      padding: 'm',
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: 'primary',
      borderRadius: 'm',
      padding: 'm',
    },
  },
});

export type Theme = typeof theme;

export const darkTheme: Theme = {
  ...theme,
  colors: {
    ...theme.colors,
    mainBackground: palette.gray900,
    cardBackground: palette.gray800,
    primaryText: palette.gray100,
    secondaryText: palette.gray400,
    tertiaryText: palette.gray500,
    
    border: palette.gray700,
    borderLight: palette.gray800,
  },
};

export default theme;
