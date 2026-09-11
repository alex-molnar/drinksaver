import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, type RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { muiTheme } from '../theme/muiTheme';

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
}

export const renderWithProviders = (ui: ReactElement, { route = '/', state, ...options }: Options = {}) => {
  const client = makeQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider theme={muiTheme}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[{ pathname: route, state }]}>{children}</MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
  return { client, ...render(ui, { wrapper: Wrapper, ...options }) };
};
