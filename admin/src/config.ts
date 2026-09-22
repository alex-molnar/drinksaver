/** Runtime configuration injected by the container entrypoint. */
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

const injected = typeof window === 'undefined' ? undefined : window.__DRINKSAVER_ADMIN_CONFIG__;

const clean = (value: string | undefined): string | undefined =>
  !value || value.startsWith('${') || value.startsWith('__') ? undefined : value;

const pick = (injectedValue: string | undefined, buildTimeValue: string | undefined, fallback: string): string =>
  clean(injectedValue) ?? clean(buildTimeValue) ?? fallback;

export const config: RuntimeConfig = {
  apiUrl: pick(injected?.apiUrl, import.meta.env.VITE_API_URL, 'http://localhost:8080'),
  keycloakUrl: pick(injected?.keycloakUrl, import.meta.env.VITE_KEYCLOAK_URL, 'http://localhost:8081/auth'),
  keycloakRealm: pick(injected?.keycloakRealm, import.meta.env.VITE_KEYCLOAK_REALM, 'drinksaver'),
  keycloakClientId: pick(injected?.keycloakClientId, import.meta.env.VITE_KEYCLOAK_CLIENT_ID, 'drinksaver-admin'),
};

export default config;
