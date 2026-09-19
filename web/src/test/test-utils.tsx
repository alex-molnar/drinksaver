import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, type RenderOptions } from '@testing-library/react';
import { TestDesignProvider } from './TestDesignProvider';
import { AppThemeProvider } from '../theme/ThemeModeProvider';
import type { ThemeMode } from '../theme/themeMode';

/**
 * A fresh QueryClient per render, with retries off. Retries make a failing
 * query take seconds and turn an assertion failure into a timeout.
 */
export const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

interface Options extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  state?: unknown;
  themeMode?: ThemeMode;
}

export const renderWithProviders = (ui: ReactElement, { route = '/', state, themeMode = 'dark', ...options }: Options = {}) => {
  const client = makeQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AppThemeProvider initialMode={themeMode}>
      <QueryClientProvider client={client}>
        <TestDesignProvider>
          <MemoryRouter initialEntries={[{ pathname: route, state }]}>{children}</MemoryRouter>
        </TestDesignProvider>
      </QueryClientProvider>
    </AppThemeProvider>
  );
  return { client, ...render(ui, { wrapper: Wrapper, ...options }) };
};
