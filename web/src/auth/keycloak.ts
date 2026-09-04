import Keycloak from 'keycloak-js';

// Keycloak configuration - configurable via environment variables
const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8081/auth',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'drinksaver',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'drinksaver-frontend',
};

// Create Keycloak instance
const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
export { keycloakConfig };
