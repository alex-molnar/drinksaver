import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { KeycloakProvider } from './auth/KeycloakProvider';
import { AdminGate } from './auth/AdminGate';
import { applyCssVars } from './theme/cssVars';
import { darkTokens } from './theme/tokens';
import { muiTheme } from './theme/muiTheme';
import './index.css';

applyCssVars(document.documentElement, darkTokens);

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KeycloakProvider>
      <AdminGate>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={muiTheme}>
            <CssBaseline />
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ThemeProvider>
        </QueryClientProvider>
      </AdminGate>
    </KeycloakProvider>
  </StrictMode>,
);
