#!/usr/bin/env bash
set -euo pipefail

DEVICE_TYPE="com.apple.CoreSimulator.SimDeviceType.iPhone-17"
RUNTIME="com.apple.CoreSimulator.SimRuntime.iOS-26-2"
NAME="DrinkSaver CI ${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}-$$"

DEVICE_TYPES="$(xcrun simctl list devicetypes --json)"
if ! printf '%s' "$DEVICE_TYPES" | python3 -c 'import json,sys; data=json.load(sys.stdin); sys.exit(not any(item.get("identifier") == "com.apple.CoreSimulator.SimDeviceType.iPhone-17" for item in data.get("devicetypes", [])))'; then
  echo "Required simulator device type is unavailable: $DEVICE_TYPE" >&2
  exit 1
fi

RUNTIMES="$(xcrun simctl list runtimes --json)"
if ! printf '%s' "$RUNTIMES" | python3 -c 'import json,sys; data=json.load(sys.stdin); sys.exit(not any(item.get("identifier") == "com.apple.CoreSimulator.SimRuntime.iOS-26-2" and item.get("isAvailable") for item in data.get("runtimes", [])))'; then
  echo "Required iOS simulator runtime is unavailable: $RUNTIME" >&2
  exit 1
fi

UDID="$(xcrun simctl create "$NAME" "$DEVICE_TYPE" "$RUNTIME")"
xcrun simctl boot "$UDID"
xcrun simctl bootstatus "$UDID" -b
printf 'Created simulator: %s (%s), runtime %s
' "$NAME" "$UDID" "$RUNTIME"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  printf 'udid=%s\n' "$UDID" >> "$GITHUB_OUTPUT"
else
  printf '%s\n' "$UDID"
fi
