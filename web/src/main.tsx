import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import './theme/fonts.css';
import { AppThemeProvider } from './theme/ThemeModeProvider';
import { applyThemeMode, readStoredThemeMode } from './theme/themeMode';

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
const initialThemeMode = readStoredThemeMode();
applyThemeMode(document.documentElement, initialThemeMode);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider initialMode={initialThemeMode}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
