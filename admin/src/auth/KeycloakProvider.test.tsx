import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { KeycloakProvider } from './KeycloakProvider';
import { useAuth } from './useAuth';
import keycloak from './keycloak';

vi.mock('./keycloak', () => ({
  default: {
    init: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    updateToken: vi.fn(),
    token: undefined as string | undefined,
    tokenParsed: undefined as
      | { sub?: string; preferred_username?: string; groups?: string[] }
      | undefined,
  },
}));

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
    vi.mocked(keycloak.init).mockReset();
    vi.mocked(keycloak.login).mockReset();
    vi.mocked(keycloak.logout).mockReset();
    vi.mocked(keycloak.updateToken).mockReset().mockResolvedValue(true);
    keycloak.token = undefined;
    keycloak.tokenParsed = undefined;
  });

  it('reports admin when the token carries the group', async () => {
    vi.mocked(keycloak.init).mockResolvedValue(true);
    keycloak.token = 'a-token';
    keycloak.tokenParsed = { sub: 'u-1', groups: ['/admin'] };

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('admin')).toHaveTextContent('true');
  });

  it('reports authenticated but not admin when the group is absent', async () => {
    vi.mocked(keycloak.init).mockResolvedValue(true);
    keycloak.token = 'a-token';
    keycloak.tokenParsed = { sub: 'u-2', groups: ['/users'] };

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('admin')).toHaveTextContent('false');
  });

  it('stops loading and grants nothing when init rejects', async () => {
    vi.mocked(keycloak.init).mockRejectedValue(new Error('keycloak unreachable'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('admin')).toHaveTextContent('false');
  });

  it('requests login-required so an anonymous visitor never sees the shell', async () => {
    vi.mocked(keycloak.init).mockResolvedValue(true);
    keycloak.tokenParsed = { sub: 'u-1', groups: ['/admin'] };

    renderProvider();

    await waitFor(() => expect(keycloak.init).toHaveBeenCalled());
    expect(keycloak.init).toHaveBeenCalledWith(
      expect.objectContaining({ onLoad: 'login-required', pkceMethod: 'S256' })
    );
  });
});
