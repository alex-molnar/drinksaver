import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loadConfig = async () => {
  vi.resetModules();
  return (await import('./config')).default;
};

describe('admin runtime config', () => {
  beforeEach(() => {
    delete window.__DRINKSAVER_ADMIN_CONFIG__;
  });

  afterEach(() => {
    delete window.__DRINKSAVER_ADMIN_CONFIG__;
  });

  it('falls back to localhost defaults when nothing is injected', async () => {
    const config = await loadConfig();

    expect(config.apiUrl).toBe('http://localhost:8080');
    expect(config.keycloakUrl).toBe('http://localhost:8081/auth');
    expect(config.keycloakRealm).toBe('drinksaver');
    expect(config.keycloakClientId).toBe('drinksaver-admin');
  });

  it('prefers injected values', async () => {
    window.__DRINKSAVER_ADMIN_CONFIG__ = {
      apiUrl: 'https://test.api.drinksaver.kak.im',
      keycloakClientId: 'test-drinksaver-admin',
    };

    const config = await loadConfig();

    expect(config.apiUrl).toBe('https://test.api.drinksaver.kak.im');
    expect(config.keycloakClientId).toBe('test-drinksaver-admin');
  });

  it('treats unsubstituted placeholders as absent', async () => {
    window.__DRINKSAVER_ADMIN_CONFIG__ = { apiUrl: '${API_URL}', keycloakRealm: '__REALM__' };

    const config = await loadConfig();

    expect(config.apiUrl).toBe('http://localhost:8080');
    expect(config.keycloakRealm).toBe('drinksaver');
  });

  it('does not read the consumer app global', async () => {
    (window as unknown as Record<string, unknown>).__DRINKSAVER_CONFIG__ = {
      apiUrl: 'https://consumer.example',
    };

    const config = await loadConfig();

    expect(config.apiUrl).toBe('http://localhost:8080');
    delete (window as unknown as Record<string, unknown>).__DRINKSAVER_CONFIG__;
  });
});
