import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import App from './App';
import './index.css';
import './theme/fonts.css';
import { applyCssVars } from './theme/cssVars';
import { darkTokens } from './theme/tokens';
import { muiTheme } from './theme/muiTheme';

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

// Stamped on <html>, not on #root: MUI portals (Modal, Snackbar, Drawer) render into
// document.body, which is a sibling of #root, and custom properties only reach them if they are
// set above both. Run before the first render so nothing that reads a `--ds-*` variable - MUI's
// theme, AppErrorBoundary's inline fallback styles, index.css - ever sees a momentary fallback.
applyCssVars(document.documentElement, darkTokens);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
