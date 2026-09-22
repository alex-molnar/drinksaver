/**
 * Runtime configuration.
 *
 * The container writes /config.js before nginx starts, so one image can serve
 * every environment without baking environment-specific values into the bundle.
 * The admin global is deliberately distinct from the consumer app's global so
 * the two applications cannot silently supply each other's Keycloak client id.
 *
 * During local development, fall back to Vite's build-time values and then to
 * localhost defaults.
 */

export interface RuntimeConfig {
  apiUrl: string;
  keycloakUrl: string;
  keycloakRealm: string;
  keycloakClientId: string;
}

declare global {
  interface Window {
    __DRINKSAVER_ADMIN_CONFIG__?: Partial<RuntimeConfig>;
  }
}

const injected = typeof window !== 'undefined' ? window.__DRINKSAVER_ADMIN_CONFIG__ : undefined;

const clean = (value: string | undefined): string | undefined => {
  if (!value || value.startsWith('${') || value.startsWith('__')) return undefined;
  return value;
};

const pick = (injectedValue: string | undefined, buildTimeValue: string | undefined, fallback: string): string =>
  clean(injectedValue) ?? clean(buildTimeValue) ?? fallback;

export const config: RuntimeConfig = {
  apiUrl: pick(injected?.apiUrl, import.meta.env.VITE_API_URL, 'http://localhost:8080'),
  keycloakUrl: pick(injected?.keycloakUrl, import.meta.env.VITE_KEYCLOAK_URL, 'http://localhost:8081/auth'),
  keycloakRealm: pick(injected?.keycloakRealm, import.meta.env.VITE_KEYCLOAK_REALM, 'drinksaver'),
  keycloakClientId: pick(injected?.keycloakClientId, import.meta.env.VITE_KEYCLOAK_CLIENT_ID, 'drinksaver-admin'),
};

export default config;
