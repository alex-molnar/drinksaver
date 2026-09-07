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
    delete window.__DRINKSAVER_CONFIG__;
  } else {
    window.__DRINKSAVER_CONFIG__ = injected;
  }
  const module = await import('./config');
  return module.config;
};

describe('runtime config', () => {
  beforeEach(() => {
    delete window.__DRINKSAVER_CONFIG__;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.__DRINKSAVER_CONFIG__;
  });

  it('falls back to localhost defaults when nothing is provided', async () => {
    const config = await loadConfig();

    expect(config.apiUrl).toBe('http://localhost:8080');
    expect(config.keycloakUrl).toBe('http://localhost:8081/auth');
    expect(config.keycloakRealm).toBe('drinksaver');
    expect(config.keycloakClientId).toBe('drinksaver-frontend');
  });

  it('prefers the runtime injected values', async () => {
    const config = await loadConfig({
      apiUrl: 'https://test.api.drinksaver.kak.im',
      keycloakUrl: 'https://auth.drinksaver.kak.im/auth',
      keycloakRealm: 'test-drinksaver',
      keycloakClientId: 'test-drinksaver-web',
    });

    expect(config.apiUrl).toBe('https://test.api.drinksaver.kak.im');
    expect(config.keycloakUrl).toBe('https://auth.drinksaver.kak.im/auth');
    expect(config.keycloakRealm).toBe('test-drinksaver');
    expect(config.keycloakClientId).toBe('test-drinksaver-web');
  });

  it('treats an unsubstituted shell placeholder as absent', async () => {
    const config = await loadConfig({ apiUrl: '${API_URL}' });

    expect(config.apiUrl).toBe('http://localhost:8080');
  });

  it('treats an unsubstituted underscore placeholder as absent', async () => {
    const config = await loadConfig({ keycloakRealm: '__KEYCLOAK_REALM__' });

    expect(config.keycloakRealm).toBe('drinksaver');
  });

  it('treats an empty injected value as absent', async () => {
    const config = await loadConfig({ apiUrl: '' });

    expect(config.apiUrl).toBe('http://localhost:8080');
  });

  it('falls back to the build time env when nothing is injected', async () => {
    vi.stubEnv('VITE_API_URL', 'https://build-time.example');

    const config = await loadConfig();

    expect(config.apiUrl).toBe('https://build-time.example');
  });

  it('prefers an injected value over the build time env', async () => {
    vi.stubEnv('VITE_API_URL', 'https://build-time.example');

    const config = await loadConfig({ apiUrl: 'https://runtime.example' });

    expect(config.apiUrl).toBe('https://runtime.example');
  });

  it('rejects a placeholder in the build time env too', async () => {
    vi.stubEnv('VITE_KEYCLOAK_CLIENT_ID', '${KEYCLOAK_CLIENT_ID}');

    const config = await loadConfig();

    expect(config.keycloakClientId).toBe('drinksaver-frontend');
  });
});
