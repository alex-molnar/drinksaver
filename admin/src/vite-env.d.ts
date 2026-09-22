/// <reference types="vite/client" />

declare global {
  interface Window {
    __DRINKSAVER_ADMIN_CONFIG__?: {
      apiUrl?: string
      keycloakUrl?: string
      keycloakRealm?: string
      keycloakClientId?: string
    }
  }
}
