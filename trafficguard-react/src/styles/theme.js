// Enhanced theme with dark mode support
// Enhanced theme with dark mode support and modern typography
export const getLightTheme = () => ({
  palette: {
    mode: 'light',
    primary: {
      main: '#4285F4', // Google Blue
      light: '#76A7FA',
      dark: '#1A5FC7',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#34A853', // Google Green
      light: '#68D57A',
      dark: '#1B7B34',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#FBBC05', // Google Yellow
      light: '#FFE680',
      dark: '#C79100',
    },
    error: {
      main: '#EA4335', // Google Red
      light: '#FF6659',
      dark: '#B7120A',
    },
    info: {
      main: '#1976D2',
      light: '#42A5F5',
      dark: '#1565C0',
    },
    success: {
      main: '#34A853',
      light: '#68D57A',
      dark: '#1B7B34',
    },
    background: {
      default: '#F0F2F5', // Slightly darker for better contrast with cards
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1F2937', // Darker gray for better readability
      secondary: '#4B5563',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '3rem', // Increased from 2.5rem
      fontWeight: 800,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2.25rem', // Increased from 2rem
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.875rem', // Increased from 1.75rem
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem', // Increased from 1rem
      fontWeight: 600,
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '1.125rem',
      lineHeight: 1.5,
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: '1rem',
      lineHeight: 1.57,
      fontWeight: 500,
    },
    body1: {
      fontSize: '1.0625rem', // ~17px for better readability
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.9375rem', // ~15px
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none', // Modern feel
      fontSize: '1rem',
    },
  },
  shape: {
    borderRadius: 16, // More rounded for modern feel
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease-in-out',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #4285F4 0%, #1A5FC7 100%)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          overflow: 'visible', // For hover effects
        },
      },
    },
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 4px 8px rgba(0,0,0,0.08)',
    '0px 8px 16px rgba(0,0,0,0.10)', // Softened
    '0px 12px 24px rgba(0,0,0,0.12)',
    '0px 16px 32px rgba(0,0,0,0.14)',
    '0px 20px 40px rgba(0,0,0,0.16)',
    ...Array(18).fill('none'), // Fill rest to avoid errors
  ],
});

export const getDarkTheme = () => ({
  palette: {
    mode: 'dark',
    primary: {
      main: '#66A3FF',
      light: '#99C2FF',
      dark: '#4285F4',
      contrastText: '#000000',
    },
    secondary: {
      main: '#5FD47F',
      light: '#8FE6A0',
      dark: '#34A853',
      contrastText: '#000000',
    },
    warning: {
      main: '#FFC94D',
      light: '#FFD97D',
      dark: '#FBBC05',
    },
    error: {
      main: '#FF6B6B',
      light: '#FF8A8A',
      dark: '#EA4335',
    },
    info: {
      main: '#64B5F6',
      light: '#90CAF9',
      dark: '#1E88E5',
    },
    success: {
      main: '#5FD47F',
      light: '#8FE6A0',
      dark: '#34A853',
    },
    background: {
      default: '#0F1115', // Deep dark blue-gray
      paper: '#181B21', // Slightly lighter
    },
    text: {
      primary: '#F3F4F6',
      secondary: '#9CA3AF',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '3rem',
      fontWeight: 800,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.875rem',
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '1.125rem',
      lineHeight: 1.5,
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: '1rem',
      lineHeight: 1.57,
      fontWeight: 500,
    },
    body1: {
      fontSize: '1.0625rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.9375rem',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      fontSize: '1rem',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 0 15px rgba(102, 163, 255, 0.3)', // Glow effect in dark mode
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease-in-out',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #66A3FF 0%, #4285F4 100%)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#181B21',
        },
        elevation1: {
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.4)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          overflow: 'visible',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        },
      },
    },
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0,0,0,0.4)',
    '0px 4px 8px rgba(0,0,0,0.5)',
    '0px 8px 16px rgba(0,0,0,0.6)',
    '0px 12px 24px rgba(0,0,0,0.7)',
    '0px 16px 32px rgba(0,0,0,0.8)',
    '0px 20px 40px rgba(0,0,0,0.9)',
    ...Array(18).fill('none'),
  ],
});

// Legacy export for backward compatibility
export const theme = getLightTheme();
