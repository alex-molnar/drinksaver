import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const keycloak = vi.hoisted(() => ({
  init: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  updateToken: vi.fn(),
  token: 'access-token' as string | undefined,
  tokenParsed: {} as Record<string, unknown>,
}));
vi.mock('./keycloak', () => ({ default: keycloak }));

import { KeycloakProvider } from './KeycloakProvider';
import { useAuth } from './useAuth';

const Probe = () => {
  const auth = useAuth();
  return <div>{`${auth.isAuthenticated}:${auth.isLoading}:${auth.isAdmin}:${auth.username}`}</div>;
};

describe('KeycloakProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    keycloak.token = 'access-token';
    keycloak.tokenParsed = { sub: 'user-1', preferred_username: 'alex', groups: ['/parent/admin'] };
    keycloak.init.mockResolvedValue(true);
  });

  it('requires login and derives admin status from the access token', async () => {
    await act(async () => {
      render(<KeycloakProvider><Probe /></KeycloakProvider>);
    });
    expect(screen.getByText('true:false:true:alex')).toBeInTheDocument();
    expect(keycloak.init).toHaveBeenCalledWith({
      onLoad: 'login-required',
      checkLoginIframe: false,
      pkceMethod: 'S256',
    });
  });

  it('does not grant admin status without the group claim', async () => {
    keycloak.tokenParsed = { groups: ['/administrators'] };
    await act(async () => {
      render(<KeycloakProvider><Probe /></KeycloakProvider>);
    });
    expect(screen.getByText('true:false:false:undefined')).toBeInTheDocument();
  });

  it('provides login and logout actions', async () => {
    const Actions = () => {
      const auth = useAuth();
      return <><button onClick={auth.login}>login</button><button onClick={auth.logout}>logout</button></>;
    };
    const { getByText } = render(<KeycloakProvider><Actions /></KeycloakProvider>);
    await waitFor(() => expect(keycloak.init).toHaveBeenCalled());
    await act(async () => { getByText('login').click(); getByText('logout').click(); });
    expect(keycloak.login).toHaveBeenCalledOnce();
    expect(keycloak.logout).toHaveBeenCalledWith({ redirectUri: window.location.origin });
  });
});
