import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import apiClient from './client';
import keycloak from '../auth/keycloak';

vi.mock('../auth/keycloak');

const ok = (config: InternalAxiosRequestConfig): AxiosResponse => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
const rejected = (status: number, config: AxiosRequestConfig) => Object.assign(new Error('request failed'), {
  isAxiosError: true,
  config,
  response: { status, data: {}, statusText: '', headers: {}, config },
});
const originalAdapter = apiClient.defaults.adapter;

describe('admin API authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(keycloak).token = 'old';
  });
  afterEach(() => { apiClient.defaults.adapter = originalAdapter; });

  it('adds the bearer token and refreshes/retries a 401 only once', async () => {
    vi.mocked(keycloak).updateToken = vi.fn().mockImplementation(async () => { vi.mocked(keycloak).token = 'new'; return true; });
    const auth: unknown[] = [];
    apiClient.defaults.adapter = async (config) => {
      auth.push(config.headers.Authorization);
      if (auth.length === 1) throw rejected(401, config);
      return ok(config);
    };
    await apiClient.get('/v1/admin/default/alcohol/types');
    expect(auth).toEqual(['Bearer old', 'Bearer new']);
    expect(keycloak.updateToken).toHaveBeenCalledOnce();
  });

  it('does not refresh a forbidden response', async () => {
    vi.mocked(keycloak).updateToken = vi.fn();
    apiClient.defaults.adapter = async (config) => { throw rejected(403, config); };
    await expect(apiClient.get('/v1/admin/default/alcohol/types')).rejects.toBeDefined();
    expect(keycloak.updateToken).not.toHaveBeenCalled();
  });
});
