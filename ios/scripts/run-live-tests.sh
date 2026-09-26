#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ "$#" -ne 1 ]]; then
  echo "Usage: $0 local|test" >&2
  exit 2
fi

case "$1" in
  local)
    api_base_url="http://localhost:8080"
    issuer_url="http://localhost:8081/auth/realms/drinksaver"
    build_configuration="Local"
    simulator_name="DrinkSaver live local"
    ;;
  test)
    api_base_url="https://test.api.drinksaver.kak.im"
    issuer_url="https://auth.drinksaver.kak.im/auth/realms/test-drinksaver"
    build_configuration="Test"
    simulator_name="DrinkSaver live test"
    ;;
  *)
    echo "Environment must be local or test; production is never supported." >&2
    exit 2
    ;;
esac

command -v curl >/dev/null || { echo "curl is required" >&2; exit 2; }
command -v jq >/dev/null || { echo "jq is required" >&2; exit 2; }
curl --connect-timeout 10 -sS -o /dev/null "$api_base_url/" || {
  echo "Backend is unreachable at $api_base_url." >&2
  exit 1
}
curl --connect-timeout 10 -fsS "$issuer_url/.well-known/openid-configuration" >/dev/null || {
  echo "Keycloak realm is unreachable at $issuer_url." >&2
  exit 1
}

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/drinksaver-live-${1}.XXXXXX")"
simulator_id=""
created_simulator=0
cleanup() {
  if [[ "$created_simulator" == "1" && -n "$simulator_id" ]]; then xcrun simctl delete "$simulator_id" >/dev/null 2>&1 || true; fi
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

simulator_id="$(xcrun simctl list devices -j | jq -r --arg name "$simulator_name" '.devices[][]? | select(.name == $name and .isAvailable) | .udid' | head -n 1)"
if [[ -z "$simulator_id" ]]; then
  simulator_id="$(xcrun simctl create "$simulator_name" com.apple.CoreSimulator.SimDeviceType.iPhone-16)"
  created_simulator=1
fi

"$SCRIPT_DIR/xcodebuild.sh" test \
  -project "$REPO_ROOT/ios/DrinkSaver.xcodeproj" \
  -scheme DrinkSaver \
  -configuration "$build_configuration" \
  -destination "platform=iOS Simulator,id=$simulator_id" \
  -parallel-testing-enabled NO \
  -only-testing:DrinkSaverUITests/LiveEnvironmentUITests/testLiveEnvironmentReadSaveUndoEditDeleteJourneyCleansUpCreatedRecords \
  -resultBundlePath "$TEMP_DIR/$1-live.xcresult"
