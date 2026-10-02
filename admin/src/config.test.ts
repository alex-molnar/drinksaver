import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeConfig } from './config';

/**
 * config.ts builds its exported object at module import time, so every case has
 * to reset the module registry and re-import. Without resetModules each test
 * would observe whatever the first import captured, and the suite would pass
 * while proving nothing.
 */
const loadConfig = async (injected?: Partial<RuntimeConfig>): Promise<RuntimeConfig> => {
  vi.resetModules();
  if (injected === undefined) {
    delete window.__DRINKSAVER_ADMIN_CONFIG__;
  } else {
    window.__DRINKSAVER_ADMIN_CONFIG__ = injected;
  }
  const module = await import('./config');
  return module.default;
};

describe('admin runtime config', () => {
  beforeEach(() => {
    delete window.__DRINKSAVER_ADMIN_CONFIG__;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.__DRINKSAVER_ADMIN_CONFIG__;
    delete (window as unknown as Record<string, unknown>).__DRINKSAVER_CONFIG__;
  });

  it('falls back to localhost defaults when nothing is provided', async () => {
    const config = await loadConfig();

    expect(config.apiUrl).toBe('http://localhost:8080');
    expect(config.keycloakUrl).toBe('http://localhost:8081/auth');
    expect(config.keycloakRealm).toBe('drinksaver');
    expect(config.keycloakClientId).toBe('drinksaver-admin');
  });

  it('prefers the runtime injected values', async () => {
    const config = await loadConfig({
      apiUrl: 'https://test.api.drinksaver.kak.im',
      keycloakUrl: 'https://auth.drinksaver.kak.im/auth',
      keycloakRealm: 'test-drinksaver',
      keycloakClientId: 'test-drinksaver-admin',
    });

    expect(config.apiUrl).toBe('https://test.api.drinksaver.kak.im');
    expect(config.keycloakUrl).toBe('https://auth.drinksaver.kak.im/auth');
    expect(config.keycloakRealm).toBe('test-drinksaver');
    expect(config.keycloakClientId).toBe('test-drinksaver-admin');
  });

  it('treats an unsubstituted shell placeholder as absent', async () => {
    const config = await loadConfig({ apiUrl: '${API_URL}', keycloakRealm: '__REALM__' });

    expect(config.apiUrl).toBe('http://localhost:8080');
    expect(config.keycloakRealm).toBe('drinksaver');
  });

  it('does not read the consumer app global', async () => {
    (window as unknown as Record<string, unknown>).__DRINKSAVER_CONFIG__ = {
      apiUrl: 'https://consumer.example',
    };

    const config = await loadConfig();

    expect(config.apiUrl).toBe('http://localhost:8080');
  });
});
