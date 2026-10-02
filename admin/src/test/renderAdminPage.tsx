import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';
import { muiTheme } from '../theme/muiTheme';

export const renderAdminPage = (element: ReactElement, route: string, pattern = '*') => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={muiTheme}>
        <MemoryRouter initialEntries={[route]}>
          <Routes><Route path={pattern} element={element} /></Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};
