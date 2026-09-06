'use client';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontFamily: 'var(--font-roboto)',
    cssVariables: true,
  },
  colorSchemes: {
    light: {
      palette: {
        secondary: {
          main: '#F5EBFF'
        },
      },
    },
    dark: {
      palette: {
        secondary: {
          main: '#353535',
        },
      },
    }
  },
});

export default theme;
