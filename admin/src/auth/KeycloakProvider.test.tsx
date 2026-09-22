import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { init, keycloakMock } = vi.hoisted(() => {
  const init = vi.fn();
  return {
    init,
    keycloakMock: {
      init,
      login: vi.fn(),
      logout: vi.fn(),
      updateToken: vi.fn(),
      token: 'a-token',
      tokenParsed: undefined as Record<string, unknown> | undefined,
    },
  };
});

vi.mock('./keycloak', () => ({ default: keycloakMock }));

import { KeycloakProvider } from './KeycloakProvider';
import { useAuth } from './useAuth';

const Probe = () => {
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="admin">{String(isAdmin)}</span>
    </div>
  );
};

const renderProvider = () =>
  render(
    <KeycloakProvider>
      <Probe />
    </KeycloakProvider>
  );

describe('KeycloakProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    keycloakMock.tokenParsed = undefined;
  });

  it('reports admin when the token carries the group', async () => {
    keycloakMock.tokenParsed = { sub: 'u-1', groups: ['/admin'] };
    init.mockResolvedValue(true);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('admin')).toHaveTextContent('true');
  });

  it('reports authenticated but not admin when the group is absent', async () => {
    keycloakMock.tokenParsed = { sub: 'u-2', groups: ['/users'] };
    init.mockResolvedValue(true);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('admin')).toHaveTextContent('false');
  });

  it('stops loading and grants nothing when init rejects', async () => {
    init.mockRejectedValue(new Error('keycloak unreachable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('admin')).toHaveTextContent('false');
  });

  it('requests login-required so an anonymous visitor never sees the shell', async () => {
    keycloakMock.tokenParsed = { sub: 'u-1', groups: ['/admin'] };
    init.mockResolvedValue(true);

    renderProvider();

    await waitFor(() => expect(init).toHaveBeenCalled());
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({ onLoad: 'login-required', pkceMethod: 'S256' })
    );
  });
});
