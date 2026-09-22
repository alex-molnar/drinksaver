/**
 * Runtime configuration.
 *
 * In a container, docker-entrypoint.sh writes /config.js before nginx starts,
 * which sets window.__DRINKSAVER_ADMIN_CONFIG__. That lets one image serve any
 * environment, because nothing environment-specific is baked into the bundle.
 *
 * The global is deliberately distinct from the consumer app's
 * window.__DRINKSAVER_CONFIG__. If the two apps are ever served from one origin,
 * one cannot then silently supply the other's Keycloak client id, which would
 * produce a token whose audience the admin endpoints reject for reasons nobody
 * would connect back to a shared global.
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
    __DRINKSAVER_ADMIN_CONFIG__?: Partial<RuntimeConfig>;
  }
}

const injected = typeof window !== 'undefined' ? window.__DRINKSAVER_ADMIN_CONFIG__ : undefined;

/**
 * An unsubstituted placeholder means the entrypoint did not replace the value,
 * so treat it as absent rather than passing "${API_URL}" to Keycloak or axios.
 */
const clean = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  if (value.startsWith('${') || value.startsWith('__')) return undefined;
  return value;
};

const pick = (
  injectedValue: string | undefined,
  buildTimeValue: string | undefined,
  fallback: string,
): string => clean(injectedValue) ?? clean(buildTimeValue) ?? fallback;

export const config: RuntimeConfig = {
  apiUrl: pick(injected?.apiUrl, import.meta.env.VITE_API_URL, 'http://localhost:8080'),
  keycloakUrl: pick(injected?.keycloakUrl, import.meta.env.VITE_KEYCLOAK_URL, 'http://localhost:8081/auth'),
  keycloakRealm: pick(injected?.keycloakRealm, import.meta.env.VITE_KEYCLOAK_REALM, 'drinksaver'),
  // A Keycloak client ID, not a local name. It differs per environment and is
  // supplied at runtime; this default only applies to local development.
  keycloakClientId: pick(
    injected?.keycloakClientId,
    import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    'drinksaver-admin',
  ),
};

export default config;
