#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
ADMIN="$ROOT/admin"
CHART="$ADMIN/helm/drinksaver-admin"
TEMP=$(mktemp -d)
trap 'rm -rf "$TEMP"' EXIT INT TERM

export CONFIG_FILE="$TEMP/config.js"
export API_URL='https://api.example.test/a"b\c'
export KEYCLOAK_URL='https://auth.example.test/auth'
export KEYCLOAK_REALM='test-realm'
export KEYCLOAK_CLIENT_ID='test-admin'
sh "$ADMIN/docker-entrypoint.sh" true
node -e 'const assert = require("node:assert/strict"); const fs = require("node:fs"); const vm = require("node:vm"); const window = {}; vm.runInNewContext(fs.readFileSync(process.env.CONFIG_FILE, "utf8"), { window }); assert.deepEqual(JSON.parse(JSON.stringify(window.__DRINKSAVER_ADMIN_CONFIG__)), { apiUrl: process.env.API_URL, keycloakUrl: process.env.KEYCLOAK_URL, keycloakRealm: process.env.KEYCLOAK_REALM, keycloakClientId: process.env.KEYCLOAK_CLIENT_ID });'

grep -Fq '<script src="/config.js"></script>' "$ADMIN/index.html"
grep -Fq 'try_files $uri $uri/ /index.html;' "$ADMIN/nginx.conf"
grep -Fq 'location = /config.js' "$ADMIN/nginx.conf"
grep -Fq 'add_header Cache-Control "no-cache, no-store, must-revalidate" always;' "$ADMIN/nginx.conf"
for header in "Content-Security-Policy" "X-Frame-Options" "X-Content-Type-Options" "Referrer-Policy" "X-Robots-Tag"; do
  grep -Fq "add_header $header" "$ADMIN/security-headers.conf"
done

for environment in test prod; do
  values="$ROOT/deploy/values/admin-$environment.yaml"
  helm lint "$CHART" --values "$values"
  rendered="$TEMP/admin-$environment.yaml"
  helm template drinksaver-admin "$CHART" --values "$values" > "$rendered"
  if [ "$environment" = test ]; then
    api_url='https://test.api.drinksaver.kak.im'
    realm='test-drinksaver'
    client='test-drinksaver-admin'
    host='test.admin.drinksaver.kak.im'
  else
    api_url='https://api.drinksaver.kak.im'
    realm='drinksaver'
    client='drinksaver-admin'
    host='admin.drinksaver.kak.im'
  fi
  grep -Fq 'name: drinksaver-admin' "$rendered"
  grep -Fq 'path: /health' "$rendered"
  grep -Fq "value: \"$api_url\"" "$rendered"
  grep -Fq "value: \"$realm\"" "$rendered"
  grep -Fq "value: \"$client\"" "$rendered"
  grep -Fq "host: \"$host\"" "$rendered"
  grep -Fq 'drinksaver-admin:3.0.0' "$rendered"
done
docker-compose --file "$ROOT/compose.yaml" config --quiet
