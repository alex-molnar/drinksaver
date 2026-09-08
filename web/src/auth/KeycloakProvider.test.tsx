import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
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

  describe('token refresh', () => {
    beforeEach(() => {
      // shouldAdvanceTime keeps real time moving, so waitFor still resolves while
      // the interval itself stays under the test's control.
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('refreshes the token on an interval once authenticated', async () => {
      vi.mocked(keycloak.init).mockResolvedValue(true);

      render(
        <KeycloakProvider>
          <Consumer />
        </KeycloakProvider>
      );

      await waitFor(() => expect(keycloak.init).toHaveBeenCalled());

      await vi.advanceTimersByTimeAsync(60_000);
      expect(keycloak.updateToken).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(60_000);
      expect(keycloak.updateToken).toHaveBeenCalledTimes(2);
    });

    /**
     * The effect started the interval and returned no cleanup, so it outlived the
     * provider. Harmless in the running app, where the provider lives as long as the
     * app does, but it leaks across hot reloads and across tests: a torn-down provider
     * kept calling updateToken and, on rejection, kept calling logout.
     *
     * The cleanup deliberately sits outside the didInit guard. The interval is created
     * after keycloak.init resolves, which is after StrictMode has already double-invoked
     * the effect, so a cleanup registered inside the guarded branch would be the
     * early-return's undefined on the second pass and never clear anything.
     */
    it('stops refreshing once unmounted', async () => {
      vi.mocked(keycloak.init).mockResolvedValue(true);

      const { unmount } = render(
        <KeycloakProvider>
          <Consumer />
        </KeycloakProvider>
      );

      await waitFor(() => expect(keycloak.init).toHaveBeenCalled());
      await vi.advanceTimersByTimeAsync(60_000);
      expect(keycloak.updateToken).toHaveBeenCalledTimes(1);

      unmount();

      await vi.advanceTimersByTimeAsync(300_000);
      expect(keycloak.updateToken).toHaveBeenCalledTimes(1);
    });

    it('logs out when a refresh is rejected', async () => {
      vi.mocked(keycloak.init).mockResolvedValue(true);
      vi.mocked(keycloak.updateToken).mockRejectedValue(new Error('refresh failed'));

      render(
        <KeycloakProvider>
          <Consumer />
        </KeycloakProvider>
      );

      await waitFor(() => expect(keycloak.init).toHaveBeenCalled());
      await vi.advanceTimersByTimeAsync(60_000);

      await waitFor(() => expect(keycloak.logout).toHaveBeenCalled());
    });

    it('never starts the interval when initialization reports not authenticated', async () => {
      vi.mocked(keycloak.init).mockResolvedValue(false);

      render(
        <KeycloakProvider>
          <Consumer />
        </KeycloakProvider>
      );

      await waitFor(() => expect(keycloak.init).toHaveBeenCalled());
      await vi.advanceTimersByTimeAsync(300_000);

      expect(keycloak.updateToken).not.toHaveBeenCalled();
    });
  });
});
