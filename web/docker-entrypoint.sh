#!/bin/sh
set -eu

# Write runtime configuration into the static bundle before nginx starts.
#
# The React bundle reads window.__DRINKSAVER_CONFIG__ (see src/config.ts), so
# nothing environment-specific is baked in at build time and one image can be
# promoted from test to production unchanged.

CONFIG_FILE=/usr/share/nginx/html/config.js

API_URL="${API_URL:-http://localhost:8080}"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8081/auth}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-drinksaver}"
KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-drinksaver-frontend}"

# JSON-escape backslashes and double quotes so a stray character cannot break
# the generated file.
escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

cat > "$CONFIG_FILE" <<CONFIG
window.__DRINKSAVER_CONFIG__ = {
  apiUrl: "$(escape "$API_URL")",
  keycloakUrl: "$(escape "$KEYCLOAK_URL")",
  keycloakRealm: "$(escape "$KEYCLOAK_REALM")",
  keycloakClientId: "$(escape "$KEYCLOAK_CLIENT_ID")"
};
CONFIG

echo "Starting frontend with apiUrl=${API_URL} keycloakUrl=${KEYCLOAK_URL} realm=${KEYCLOAK_REALM}"

exec "$@"
