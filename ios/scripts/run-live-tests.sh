#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ "${1:-}" != "local" || "$#" -ne 1 ]]; then
  echo "Usage: $0 local" >&2
  echo "Only Local is enabled; Test requires IOS-023B and separate authorization." >&2
  exit 2
fi

command -v curl >/dev/null || { echo "curl is required" >&2; exit 2; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 2; }
curl --connect-timeout 3 -sS -o /dev/null http://localhost:8080/ || {
  echo "Local backend is unavailable at http://localhost:8080; start compose.yaml first." >&2
  exit 1
}
curl -fsS http://localhost:8081/auth/realms/drinksaver/.well-known/openid-configuration >/dev/null || {
  echo "Local Keycloak realm is unavailable at http://localhost:8081/auth/realms/drinksaver." >&2
  exit 1
}

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/drinksaver-live-local.XXXXXX")"
simulator_id="$(xcrun simctl list devices -j | jq -r '.devices[][]? | select(.name == "DrinkSaver live local" and .isAvailable) | .udid' | head -n 1)"
created_simulator=0
if [[ -z "$simulator_id" ]]; then
  simulator_id="$(xcrun simctl create "DrinkSaver live local" com.apple.CoreSimulator.SimDeviceType.iPhone-16)"
  created_simulator=1
fi
cleanup() {
  if [[ "$created_simulator" == "1" ]]; then xcrun simctl delete "$simulator_id" >/dev/null 2>&1 || true; fi
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

"$SCRIPT_DIR/xcodebuild.sh" test \
  -project "$REPO_ROOT/ios/DrinkSaver.xcodeproj" \
  -scheme DrinkSaver \
  -configuration Local \
  -destination "platform=iOS Simulator,id=$simulator_id" \
  -parallel-testing-enabled NO \
  -only-testing:DrinkSaverUITests/LiveEnvironmentUITests/testLocalReadSaveUndoEditDeleteJourneyCleansUpCreatedRecords \
  -resultBundlePath "$TEMP_DIR/local-live.xcresult"
