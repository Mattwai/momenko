export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  onSurface: string;
  onSurfaceVariant: string;
  text: string;
  textSecondary: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  border: string;
  disabled: string;
  placeholder: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeTypography {
  fontSizeSmall: number;
  fontSizeBase: number;
  fontSizeLarge: number;
  fontSizeXLarge: number;
  fontWeightLight: string;
  fontWeightRegular: string;
  fontWeightMedium: string;
  fontWeightBold: string;
  lineHeightSmall: number;
  lineHeightBase: number;
  lineHeightLarge: number;
}

export interface Theme {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  typography: ThemeTypography;
  borderRadius: {
    small: number;
    medium: number;
    large: number;
  };
  shadows: {
    small: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    medium: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    large: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
}

const lightColors: ThemeColors = {
  primary: '#2E86AB',
  secondary: '#A23B72',
  accent: '#F18F01',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  onSurface: '#212529',
  onSurfaceVariant: '#6C757D',
  text: '#212529',
  textSecondary: '#6C757D',
  error: '#DC3545',
  warning: '#FFC107',
  success: '#28A745',
  info: '#17A2B8',
  border: '#DEE2E6',
  disabled: '#ADB5BD',
  placeholder: '#9CA3AF',
};

const darkColors: ThemeColors = {
  primary: '#4A9ECD',
  secondary: '#C25C8B',
  accent: '#FFB84D',
  background: '#1A1A1A',
  surface: '#2D2D2D',
  onSurface: '#FFFFFF',
  onSurfaceVariant: '#B0B0B0',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  error: '#FF6B6B',
  warning: '#FFE066',
  success: '#51CF66',
  info: '#339AF0',
  border: '#404040',
  disabled: '#666666',
  placeholder: '#808080',
};

const spacing: ThemeSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const typography: ThemeTypography = {
  fontSizeSmall: 12,
  fontSizeBase: 16,
  fontSizeLarge: 20,
  fontSizeXLarge: 24,
  fontWeightLight: '300',
  fontWeightRegular: '400',
  fontWeightMedium: '500',
  fontWeightBold: '700',
  lineHeightSmall: 16,
  lineHeightBase: 24,
  lineHeightLarge: 32,
};

const createTheme = (colors: ThemeColors): Theme => ({
  colors,
  spacing,
  typography,
  borderRadius: {
    small: 4,
    medium: 8,
    large: 16,
  },
  shadows: {
    small: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    large: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
});

export const lightTheme = createTheme(lightColors);
export const darkTheme = createTheme(darkColors);

// Default export
export const theme = lightTheme;

// Cultural theme variants for accessibility and cultural preferences
export const culturalThemes = {
  highContrast: createTheme({
    ...lightColors,
    primary: '#000000',
    secondary: '#4A4A4A',
    text: '#000000',
    background: '#FFFFFF',
    surface: '#F0F0F0',
    onSurface: '#000000',
    onSurfaceVariant: '#4A4A4A',
    border: '#000000',
  }),
  largeText: {
    ...lightTheme,
    typography: {
      ...typography,
      fontSizeSmall: 16,
      fontSizeBase: 20,
      fontSizeLarge: 24,
      fontSizeXLarge: 28,
    },
  },
  warm: createTheme({
    ...lightColors,
    primary: '#8B4513',
    secondary: '#CD853F',
    accent: '#DAA520',
    background: '#FFF8DC',
    surface: '#F5F5DC',
    onSurface: '#8B4513',
    onSurfaceVariant: '#CD853F',
  }),
};