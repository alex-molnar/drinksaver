#!/bin/sh
set -eu

CONFIG_FILE="${CONFIG_FILE:-/usr/share/nginx/html/config.js}"
API_URL="${API_URL:-http://localhost:8080}"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8081/auth}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-drinksaver}"
KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-drinksaver-admin}"

escape() {
  printf '%s' "$1" | tr -d '\r\n' | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

cat > "$CONFIG_FILE" <<CONFIG
window.__DRINKSAVER_ADMIN_CONFIG__ = {
  apiUrl: "$(escape "$API_URL")",
  keycloakUrl: "$(escape "$KEYCLOAK_URL")",
  keycloakRealm: "$(escape "$KEYCLOAK_REALM")",
  keycloakClientId: "$(escape "$KEYCLOAK_CLIENT_ID")"
};
CONFIG

exec "$@"
