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
    tokenParsed: undefined as { sub?: string; preferred_username?: string } | undefined,
  },
}));

const Consumer = () => {
  const { isLoading, isAuthenticated, userId, username } = useAuth();
  if (isLoading) return <div data-testid="consumer">loading</div>;
  return (
    <div data-testid="consumer">{`${isAuthenticated ? 'authenticated' : 'anonymous'}:${userId}:${username}`}</div>
  );
};

beforeEach(() => {
  vi.mocked(keycloak.init).mockReset();
  vi.mocked(keycloak.login).mockReset();
  vi.mocked(keycloak.logout).mockReset();
  vi.mocked(keycloak.updateToken).mockReset().mockResolvedValue(true);
  keycloak.token = undefined;
  keycloak.tokenParsed = undefined;
});

describe('KeycloakProvider', () => {
  it('renders children immediately, before initialization has resolved', () => {
    vi.mocked(keycloak.init).mockReturnValue(new Promise(() => {})); // never resolves

    render(
      <KeycloakProvider>
        <Consumer />
      </KeycloakProvider>
    );

    expect(screen.getByTestId('consumer')).toHaveTextContent('loading');
  });

  it('exposes isAuthenticated, userId and username from the parsed token once initialization resolves', async () => {
    let resolveInit!: (value: boolean) => void;
    vi.mocked(keycloak.init).mockReturnValue(
      new Promise((resolve) => {
        resolveInit = resolve;
      })
    );

    render(
      <KeycloakProvider>
        <Consumer />
      </KeycloakProvider>
    );

    keycloak.token = 'a-token';
    keycloak.tokenParsed = { sub: 'user-1', preferred_username: 'alex' };
    resolveInit(true);

    await waitFor(() =>
      expect(screen.getByTestId('consumer')).toHaveTextContent('authenticated:user-1:alex')
    );
  });

  it('reports not authenticated and stops loading when initialization fails', async () => {
    vi.mocked(keycloak.init).mockRejectedValue(new Error('network down'));

    render(
      <KeycloakProvider>
        <Consumer />
      </KeycloakProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('consumer')).toHaveTextContent('anonymous:undefined:undefined')
    );
  });
});
