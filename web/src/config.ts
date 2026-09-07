/**
 * Runtime configuration.
 *
 * In a container, docker-entrypoint.sh writes /config.js before nginx starts,
 * which sets window.__DRINKSAVER_CONFIG__. That lets one image serve any
 * environment, because nothing environment-specific is baked into the bundle.
 *
 * During `npm run dev` there is no /config.js, so we fall back to Vite's
 * import.meta.env and then to localhost defaults.
 */

export interface RuntimeConfig {
  apiUrl: string;
  keycloakUrl: string;
  keycloakRealm: string;
  keycloakClientId: string;
}

declare global {
  interface Window {
    __DRINKSAVER_CONFIG__?: Partial<RuntimeConfig>;
  }
}

const injected = typeof window !== 'undefined' ? window.__DRINKSAVER_CONFIG__ : undefined;

/**
 * An unsubstituted placeholder means the entrypoint did not replace the value,
 * so treat it as absent rather than passing "${API_URL}" to Keycloak or axios.
 */
const clean = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  if (value.startsWith('${') || value.startsWith('__')) return undefined;
  return value;
};

const pick = (injectedValue: string | undefined, buildTimeValue: string | undefined, fallback: string): string =>
  clean(injectedValue) ?? clean(buildTimeValue) ?? fallback;

export const config: RuntimeConfig = {
  apiUrl: pick(injected?.apiUrl, import.meta.env.VITE_API_URL, 'http://localhost:8080'),
  keycloakUrl: pick(injected?.keycloakUrl, import.meta.env.VITE_KEYCLOAK_URL, 'http://localhost:8081/auth'),
  keycloakRealm: pick(injected?.keycloakRealm, import.meta.env.VITE_KEYCLOAK_REALM, 'drinksaver'),
  // NOTE: this is the client ID registered in Keycloak, not a local name.
  // It stays `drinksaver-frontend` even though the app is now called web.
  keycloakClientId: pick(
    injected?.keycloakClientId,
    import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    'drinksaver-frontend',
  ),
};

export default config;
