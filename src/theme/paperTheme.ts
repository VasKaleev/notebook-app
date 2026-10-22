import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Светлая тема — фиолетовый акцент, как в Material You
export const paperLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6750A4',
    secondary: '#625B71',
    background: '#FEF7FF',
    surface: '#FFFFFF',
    surfaceVariant: '#E7E0EC',
    onSurface: '#1D1B20',
  },
};

// Тёмная тема
export const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#D0BCFF',
    secondary: '#CCC2DC',
    background: '#141218',
    surface: '#1D1B20',
    surfaceVariant: '#49454F',
    onSurface: '#E6E0E9',
  },
};
