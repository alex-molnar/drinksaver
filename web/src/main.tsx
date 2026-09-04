import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import App from './App';
import './index.css';

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Create MUI theme with modern mobile-friendly design
const theme = createTheme({
  palette: {
    primary: {
      main: '#f57c00', // Warm amber-orange
      light: '#ffb74d',
      dark: '#e65100',
      contrastText: '#fff',
    },
    secondary: {
      main: '#5d4037', // Warm brown
      light: '#8b6b61',
      dark: '#3e2723',
    },
    success: {
      main: '#43a047',
      light: '#e8f5e9',
      dark: '#2e7d32',
    },
    error: {
      main: '#e53935',
      light: '#ffebee',
      dark: '#c62828',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    subtitle1: {
      fontWeight: 500,
    },
    body1: {
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(0,0,0,0.05)',
    '0px 4px 8px rgba(0,0,0,0.08)',
    '0px 6px 12px rgba(0,0,0,0.1)',
    '0px 8px 16px rgba(0,0,0,0.12)',
    '0px 10px 20px rgba(0,0,0,0.14)',
    '0px 12px 24px rgba(0,0,0,0.16)',
    '0px 14px 28px rgba(0,0,0,0.18)',
    '0px 16px 32px rgba(0,0,0,0.2)',
    '0px 16px 32px rgba(0,0,0,0.2)',
    '0px 16px 32px rgba(0,0,0,0.2)',
    '0px 16px 32px rgba(0,0,0,0.2)',
    '0px 16px 32px rgba(0,0,0,0.2)',
    '0px 16px 32px rgba(0,0,0,0.2)',
    '0px 16px 32px rgba(0,0,0,0.2)',
    '0px 16px 32px rgba(0,0,0,0.2)',
    '0px 16px 32px rgba(0,0,0,0.2)',
    '0px 16px 32px rgba(0,0,0,0.2)',
    '0px 16px 32px rgba(0,0,0,0.2)',
    '0px 16px 32px rgba(0,0,0,0.2)',
    '0px 16px 32px rgba(0,0,0,0.2)',
    '0px 16px 32px rgba(0,0,0,0.2)',
    '0px 16px 32px rgba(0,0,0,0.2)',
    '0px 16px 32px rgba(0,0,0,0.2)',
    '0px 16px 32px rgba(0,0,0,0.2)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          minHeight: 48,
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(245, 124, 0, 0.3)',
          },
        },
        contained: {
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            minHeight: 52,
            borderRadius: 12,
          },
          '& .MuiOutlinedInput-root': {
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#f57c00',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          minHeight: 52,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          height: 64,
          borderTop: '1px solid rgba(0,0,0,0.08)',
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 60,
          padding: '8px 12px',
          '&.Mui-selected': {
            color: '#f57c00',
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 16px rgba(245, 124, 0, 0.4)',
        },
      },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
