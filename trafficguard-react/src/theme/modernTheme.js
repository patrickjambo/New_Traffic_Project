// src/theme/modernTheme.js - 2025 Ultra-Modern Theme
import { createTheme } from '@mui/material/styles';

// 🎨 AI Neon Glow Palette
const neonColors = {
  electricPurple: '#8A2BE2',
  hyperBlue: '#236BFF',
  neoCyan: '#00F6FF',
  magentaPink: '#FF1BAA',
  jetBlack: '#0A0A0A',
};

// 🎨 Holographic Gradient
const holographic = {
  gradient: 'linear-gradient(135deg, #E0B3FF 0%, #A8C7FA 50%, #FFB3D9 100%)',
  gradientAnimated: `
    linear-gradient(
      -45deg,
      #E0B3FF,
      #A8C7FA,
      #FFB3D9,
      #B8E6F0
    )
  `,
};

// 🎨 Earthy + Minimal
const earthyColors = {
  mutedGreen: '#617A55',
  warmNeutral: '#F0E9E1',
  softCream: '#FFFAF3',
  deepCharcoal: '#1A1A1A',
};

// Light Theme
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: neonColors.hyperBlue,
      light: '#5B8DFF',
      dark: '#1A52CC',
      contrastText: '#fff',
    },
    secondary: {
      main: neonColors.electricPurple,
      light: '#A855F7',
      dark: '#6B21A8',
      contrastText: '#fff',
    },
    accent: {
      cyan: neonColors.neoCyan,
      magenta: neonColors.magentaPink,
      purple: neonColors.electricPurple,
    },
    background: {
      default: earthyColors.softCream,
      paper: '#FFFFFF',
      elevated: '#FAFAFA',
    },
    text: {
      primary: earthyColors.deepCharcoal,
      secondary: '#4A5568',
    },
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
    },
    info: {
      main: neonColors.neoCyan,
      light: '#67E8F9',
      dark: '#0891B2',
    },
  },
  typography: {
    fontFamily: '"Space Grotesk", "Inter", "Sora", system-ui, sans-serif',
    h1: {
      fontFamily: '"Sora", sans-serif',
      fontWeight: 800,
      fontSize: '3.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: '"Sora", sans-serif',
      fontWeight: 700,
      fontSize: '2.75rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.4,
    },
    h4: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.5,
    },
    body1: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    button: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.01em',
    },
  },
  shape: {
    borderRadius: 16, // 2XL rounded
  },
  shadows: [
    'none',
    '0px 2px 8px rgba(138, 43, 226, 0.08)',
    '0px 4px 16px rgba(138, 43, 226, 0.12)',
    '0px 8px 24px rgba(138, 43, 226, 0.16)',
    '0px 12px 32px rgba(138, 43, 226, 0.2)',
    '0px 16px 48px rgba(138, 43, 226, 0.24)',
    // Soft shadows with wide spread
    '0px 20px 60px rgba(138, 43, 226, 0.25)',
    '0px 24px 80px rgba(138, 43, 226, 0.3)',
    '0px 32px 100px rgba(138, 43, 226, 0.35)',
    // Glow effect shadows
    '0px 0px 20px rgba(35, 107, 255, 0.4)',
    '0px 0px 30px rgba(0, 246, 255, 0.5)',
    '0px 0px 40px rgba(255, 27, 170, 0.4)',
    // Depth shadows
    '0px 40px 120px rgba(0, 0, 0, 0.2)',
    '0px 50px 150px rgba(0, 0, 0, 0.25)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: '1rem',
          fontWeight: 600,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0px 8px 24px rgba(138, 43, 226, 0.3)',
          },
          '&:active': {
            transform: 'translateY(0px)',
          },
        },
        contained: {
          background: `linear-gradient(135deg, ${neonColors.hyperBlue} 0%, ${neonColors.electricPurple} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${neonColors.electricPurple} 0%, ${neonColors.hyperBlue} 100%)`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20, // 2XL
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          border: '1px solid rgba(138, 43, 226, 0.1)',
          '&:hover': {
            transform: 'translateY(-4px) scale(1.02)',
            boxShadow: '0px 20px 60px rgba(138, 43, 226, 0.25)',
            borderColor: 'rgba(138, 43, 226, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          transition: 'all 0.3s ease',
        },
        elevation1: {
          boxShadow: '0px 2px 8px rgba(138, 43, 226, 0.08)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'all 0.3s ease',
            '&:hover fieldset': {
              borderColor: neonColors.hyperBlue,
            },
            '&.Mui-focused fieldset': {
              borderColor: neonColors.hyperBlue,
              borderWidth: '2px',
              boxShadow: `0 0 0 3px rgba(35, 107, 255, 0.1)`,
            },
          },
        },
      },
    },
  },
});

// Dark Theme with Depth
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: neonColors.neoCyan,
      light: '#67E8F9',
      dark: '#0891B2',
      contrastText: '#000',
    },
    secondary: {
      main: neonColors.magentaPink,
      light: '#FF4DC1',
      dark: '#CC1588',
      contrastText: '#fff',
    },
    accent: {
      cyan: neonColors.neoCyan,
      magenta: neonColors.magentaPink,
      purple: neonColors.electricPurple,
    },
    background: {
      default: '#000000', // True Black
      paper: '#0A0A0A', // Rich Gray
      elevated: '#1A1A1A',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#A0AEC0',
    },
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
    },
    info: {
      main: neonColors.neoCyan,
      light: '#67E8F9',
      dark: '#0891B2',
    },
  },
  typography: {
    fontFamily: '"Space Grotesk", "Inter", "Sora", system-ui, sans-serif',
    h1: {
      fontFamily: '"Sora", sans-serif',
      fontWeight: 800,
      fontSize: '3.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
      background: holographic.gradient,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h2: {
      fontFamily: '"Sora", sans-serif',
      fontWeight: 700,
      fontSize: '2.75rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.4,
    },
    body1: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    button: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 16,
  },
  shadows: [
    'none',
    // Neon glow shadows
    `0px 0px 20px rgba(0, 246, 255, 0.3)`,
    `0px 0px 30px rgba(0, 246, 255, 0.4)`,
    `0px 0px 40px rgba(0, 246, 255, 0.5)`,
    `0px 0px 20px rgba(255, 27, 170, 0.3)`,
    `0px 0px 30px rgba(255, 27, 170, 0.4)`,
    `0px 0px 40px rgba(255, 27, 170, 0.5)`,
    `0px 0px 20px rgba(138, 43, 226, 0.3)`,
    `0px 0px 30px rgba(138, 43, 226, 0.4)`,
    // Depth shadows
    '0px 20px 60px rgba(0, 0, 0, 0.5)',
    '0px 30px 80px rgba(0, 0, 0, 0.6)',
    '0px 40px 100px rgba(0, 0, 0, 0.7)',
    '0px 50px 120px rgba(0, 0, 0, 0.8)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `0px 0px 30px rgba(0, 246, 255, 0.5)`,
          },
        },
        contained: {
          background: `linear-gradient(135deg, ${neonColors.neoCyan} 0%, ${neonColors.electricPurple} 100%)`,
          boxShadow: `0px 0px 20px rgba(0, 246, 255, 0.3)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${neonColors.electricPurple} 0%, ${neonColors.neoCyan} 100%)`,
            boxShadow: `0px 0px 40px rgba(0, 246, 255, 0.6)`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          backgroundColor: 'rgba(10, 10, 10, 0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 246, 255, 0.2)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px) scale(1.02)',
            borderColor: 'rgba(0, 246, 255, 0.5)',
            boxShadow: `0px 0px 30px rgba(0, 246, 255, 0.4)`,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: 'rgba(10, 10, 10, 0.9)',
          backdropFilter: 'blur(20px)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '&:hover fieldset': {
              borderColor: neonColors.neoCyan,
              boxShadow: `0 0 10px rgba(0, 246, 255, 0.3)`,
            },
            '&.Mui-focused fieldset': {
              borderColor: neonColors.neoCyan,
              borderWidth: '2px',
              boxShadow: `0 0 20px rgba(0, 246, 255, 0.5)`,
            },
          },
        },
      },
    },
  },
});

// Holographic Theme
export const holographicTheme = createTheme({
  ...lightTheme,
  palette: {
    ...lightTheme.palette,
    background: {
      default: '#F8F9FF',
      paper: 'rgba(255, 255, 255, 0.7)',
      elevated: 'rgba(255, 255, 255, 0.9)',
    },
  },
  components: {
    ...lightTheme.components,
    MuiCard: {
      styleOverrides: {
        root: {
          background: holographic.gradient,
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0px 8px 32px rgba(160, 179, 255, 0.3)',
        },
      },
    },
  },
});

export const themes = {
  light: lightTheme,
  dark: darkTheme,
  holographic: holographicTheme,
};

export default themes;
