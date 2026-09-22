import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminGate } from './AdminGate';

const auth = vi.hoisted(() => ({ isAuthenticated: false, isLoading: false, isAdmin: false, logout: vi.fn() }));
vi.mock('./useAuth', () => ({ useAuth: () => auth }));

describe('AdminGate', () => {
  beforeEach(() => {
    auth.isAuthenticated = false;
    auth.isLoading = false;
    auth.isAdmin = false;
    auth.logout.mockReset();
  });

  it('shows loading state', () => {
    auth.isLoading = true;
    const { unmount } = render(<AdminGate><div>Admin shell</div></AdminGate>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Admin shell')).not.toBeInTheDocument();
    auth.isLoading = false;
    unmount();
  });

  it('renders children only for an authenticated admin', () => {
    auth.isAuthenticated = true;
    auth.isAdmin = true;
    const { unmount } = render(<AdminGate><div>Admin shell</div></AdminGate>);
    expect(screen.getByText('Admin shell')).toBeInTheDocument();
    auth.isAdmin = false;
    auth.isAuthenticated = false;
    unmount();
  });

  it('offers sign-out to an authenticated non-admin', () => {
    auth.isAuthenticated = true;
    auth.isAdmin = false;
    render(<AdminGate><div>Admin shell</div></AdminGate>);
    expect(screen.queryByText('Admin shell')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(auth.logout).toHaveBeenCalledOnce();
    auth.isAuthenticated = false;
  });

  it('does not offer sign-out when authentication failed', () => {
    auth.isAuthenticated = false;
    render(<AdminGate><div>Admin shell</div></AdminGate>);
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });
});
