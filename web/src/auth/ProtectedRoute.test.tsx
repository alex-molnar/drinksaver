import { describe, expect, it, vi, beforeEach } from 'vitest';
import type Keycloak from 'keycloak-js';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from './useAuth';

vi.mock('./useAuth');

const mockUseAuth = vi.mocked(useAuth);

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a spinner and loading text while loading', () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      token: undefined,
      userId: undefined,
      username: undefined,
      login: vi.fn(),
      logout: vi.fn(),
      keycloak: {} as unknown as Keycloak,
    });

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
  });

  it('renders children once authenticated', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      token: 'test-token',
      userId: 'user-123',
      username: 'testuser',
      login: vi.fn(),
      logout: vi.fn(),
      keycloak: {} as unknown as Keycloak,
    });

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText(/protected content/i)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders redirecting message when not authenticated and not loading', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      token: undefined,
      userId: undefined,
      username: undefined,
      login: vi.fn(),
      logout: vi.fn(),
      keycloak: {} as unknown as Keycloak,
    });

    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText(/redirecting to login/i)).toBeInTheDocument();
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument();
  });
});
