import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminGate } from './AdminGate';
import { AuthContext, type AuthContextType } from './AuthContext';

const ctx = (overrides: Partial<AuthContextType>): AuthContextType => ({
  isAuthenticated: true,
  isLoading: false,
  isAdmin: false,
  token: 'a-token',
  userId: 'u-1',
  username: 'someone',
  login: vi.fn(),
  logout: vi.fn(),
  keycloak: {} as AuthContextType['keycloak'],
  ...overrides,
});

const renderGate = (overrides: Partial<AuthContextType>) =>
  render(
    <AuthContext.Provider value={ctx(overrides)}>
      <AdminGate>
        <div>admin shell</div>
      </AdminGate>
    </AuthContext.Provider>
  );

describe('AdminGate', () => {
  it('shows a loading state while Keycloak initialises', () => {
    renderGate({ isLoading: true });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('admin shell')).not.toBeInTheDocument();
  });

  it('renders the children for a member of the admin group', () => {
    renderGate({ isAdmin: true });
    expect(screen.getByText('admin shell')).toBeInTheDocument();
  });

  it('refuses a signed-in user outside the group and offers a way out', async () => {
    const logout = vi.fn();
    renderGate({ isAdmin: false, logout });

    expect(screen.queryByText('admin shell')).not.toBeInTheDocument();
    expect(screen.getByText(/not authorised/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('refuses an unauthenticated session too', () => {
    renderGate({ isAuthenticated: false, isAdmin: false });
    expect(screen.queryByText('admin shell')).not.toBeInTheDocument();
    expect(screen.getByText(/not authorised/i)).toBeInTheDocument();
  });
});
