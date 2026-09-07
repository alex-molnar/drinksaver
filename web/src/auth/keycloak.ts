import Keycloak from 'keycloak-js';
import config from '../config';

// Keycloak configuration, supplied at container start by /config.js
const keycloakConfig = {
  url: config.keycloakUrl,
  realm: config.keycloakRealm,
  clientId: config.keycloakClientId,
};

// Create Keycloak instance
const keycloak = new Keycloak(keycloakConfig);

export default keycloak;
export { keycloakConfig };
