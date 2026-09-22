// Local development stand-in. In a container docker-entrypoint.sh overwrites
// this file before nginx starts. Values here are the local compose stack.
window.__DRINKSAVER_ADMIN_CONFIG__ = {
  apiUrl: "http://localhost:8080",
  keycloakUrl: "http://localhost:8081/auth",
  keycloakRealm: "drinksaver",
  keycloakClientId: "drinksaver-admin"
};