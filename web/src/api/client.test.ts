import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import apiClient from './client';
import keycloak from '../auth/keycloak';

vi.mock('../auth/keycloak');

/**
 * The interceptors are attached to the axios instance when the module loads, so
 * mocking axios wholesale would mean the code under test never runs. Swapping
 * only the adapter keeps the real interceptor chain and lets us decide what the
 * "server" returns.
 */
const ok = (config: InternalAxiosRequestConfig): AxiosResponse => ({
  data: { ok: true },
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

const httpError = (status: number, config: AxiosRequestConfig) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    config,
    response: { status, data: {}, statusText: '', headers: {}, config },
  });

const originalAdapter = apiClient.defaults.adapter;

describe('api/client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(keycloak).token = undefined;
    vi.mocked(keycloak).tokenParsed = undefined;
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  describe('request interceptor', () => {
    it('attaches the bearer token when keycloak has one', async () => {
      vi.mocked(keycloak).token = 'token-abc';
      const seen: InternalAxiosRequestConfig[] = [];
      apiClient.defaults.adapter = async (config) => {
        seen.push(config);
        return ok(config);
      };

      await apiClient.get('/anything');

      expect(seen[0].headers.Authorization).toBe('Bearer token-abc');
    });

    it('sends no Authorization header when there is no token', async () => {
      const seen: InternalAxiosRequestConfig[] = [];
      apiClient.defaults.adapter = async (config) => {
        seen.push(config);
        return ok(config);
      };

      await apiClient.get('/anything');

      // Notably not the string "Bearer undefined".
      expect(seen[0].headers.Authorization).toBeUndefined();
    });
  });

  describe('response interceptor', () => {
    it('refreshes the token on a 401 and retries the request', async () => {
      vi.mocked(keycloak).token = 'stale';
      vi.mocked(keycloak).updateToken = vi.fn().mockImplementation(async () => {
        vi.mocked(keycloak).token = 'fresh';
        return true;
      });

      const attempts: (string | undefined)[] = [];
      apiClient.defaults.adapter = async (config) => {
        attempts.push(config.headers.Authorization as string | undefined);
        if (attempts.length === 1) throw httpError(401, config);
        return ok(config);
      };

      const response = await apiClient.get('/anything');

      expect(keycloak.updateToken).toHaveBeenCalledWith(5);
      expect(attempts).toHaveLength(2);
      expect(attempts[1]).toBe('Bearer fresh');
      expect(response.status).toBe(200);
    });

    /**
     * The retry re-enters this same interceptor, so without a marker on the retried
     * request a 401 that a refresh cannot fix loops forever.
     *
     * That is not a hypothetical: keycloak-js resolves updateToken(5) with `false`,
     * without contacting Keycloak at all, whenever the local token still has five
     * seconds of validity left. So for every 401 whose cause is not local expiry, a
     * rotated realm signing key, a revoked session, an audience or issuer mismatch,
     * clock skew, the refresh "succeeds", the same token is replayed, and the same 401
     * comes back. Measured before the fix: 501 attempts and logout never reached.
     */
    it('retries a 401 exactly once when the refresh cannot fix it, then logs out', async () => {
      vi.mocked(keycloak).token = 'valid-but-rejected';
      // Resolves false and leaves the token alone, which is what keycloak-js does when
      // the token is not near expiry.
      vi.mocked(keycloak).updateToken = vi.fn().mockResolvedValue(false);
      vi.mocked(keycloak).logout = vi.fn();

      let attempts = 0;
      apiClient.defaults.adapter = async (config) => {
        attempts += 1;
        if (attempts > 10) throw new Error('retry loop: the interceptor did not give up');
        throw httpError(401, config);
      };

      await expect(apiClient.get('/anything')).rejects.toBeDefined();

      expect(attempts).toBe(2);
      expect(keycloak.logout).toHaveBeenCalledTimes(1);
    });

    it('logs out when the refresh fails, and still rejects', async () => {
      vi.mocked(keycloak).token = 'stale';
      vi.mocked(keycloak).updateToken = vi.fn().mockRejectedValue(new Error('refresh failed'));
      vi.mocked(keycloak).logout = vi.fn();

      apiClient.defaults.adapter = async (config) => {
        throw httpError(401, config);
      };

      await expect(apiClient.get('/anything')).rejects.toThrow();
      expect(keycloak.logout).toHaveBeenCalled();
    });

    it('does not attempt a refresh for a non-401 error', async () => {
      vi.mocked(keycloak).updateToken = vi.fn();
      apiClient.defaults.adapter = async (config) => {
        throw httpError(500, config);
      };

      await expect(apiClient.get('/anything')).rejects.toThrow();
      expect(keycloak.updateToken).not.toHaveBeenCalled();
    });
  });

});
