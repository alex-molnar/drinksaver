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
