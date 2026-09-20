#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PROJECT="DrinkSaver.xcodeproj"
CONFIGS=(Local Test Release)
EXPECTED_BUNDLE_ID="im.kak.drinksaver"
EXPECTED_DEPLOYMENT_TARGET="18.0"
EXPECTED_DEVICE_FAMILY="1"
EXPECTED_SWIFT_VERSION="6.0"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

get_setting() {
  local settings="$1"
  local key="$2"
  awk -F ' = ' -v key="$key" '$1 ~ "^[ \t]*"key"[ \t]*$" { print $2; exit }' <<<"$settings"
}

for CONFIG in "${CONFIGS[@]}"; do
  SETTINGS="$(xcodebuild -project "$PROJECT" -target DrinkSaver -configuration "$CONFIG" -showBuildSettings)"

  DEPLOYMENT_TARGET="$(get_setting "$SETTINGS" IPHONEOS_DEPLOYMENT_TARGET)"
  [[ "$DEPLOYMENT_TARGET" == "$EXPECTED_DEPLOYMENT_TARGET" ]] \
    || fail "$CONFIG: IPHONEOS_DEPLOYMENT_TARGET is '$DEPLOYMENT_TARGET', expected $EXPECTED_DEPLOYMENT_TARGET"

  DEVICE_FAMILY="$(get_setting "$SETTINGS" TARGETED_DEVICE_FAMILY)"
  [[ "$DEVICE_FAMILY" == "$EXPECTED_DEVICE_FAMILY" ]] \
    || fail "$CONFIG: TARGETED_DEVICE_FAMILY is '$DEVICE_FAMILY', expected $EXPECTED_DEVICE_FAMILY (iPhone only)"

  BUNDLE_ID="$(get_setting "$SETTINGS" PRODUCT_BUNDLE_IDENTIFIER)"
  [[ "$BUNDLE_ID" == "$EXPECTED_BUNDLE_ID" ]] \
    || fail "$CONFIG: PRODUCT_BUNDLE_IDENTIFIER is '$BUNDLE_ID', expected $EXPECTED_BUNDLE_ID"

  SWIFT_VERSION="$(get_setting "$SETTINGS" SWIFT_VERSION)"
  [[ "$SWIFT_VERSION" == "$EXPECTED_SWIFT_VERSION" ]] \
    || fail "$CONFIG: SWIFT_VERSION is '$SWIFT_VERSION', expected $EXPECTED_SWIFT_VERSION"

  GENERATE_INFOPLIST="$(get_setting "$SETTINGS" GENERATE_INFOPLIST_FILE)"
  [[ "$GENERATE_INFOPLIST" == "NO" ]] \
    || fail "$CONFIG: GENERATE_INFOPLIST_FILE is '$GENERATE_INFOPLIST', expected NO (physical Info.plist required)"

  INFOPLIST_PATH="$(get_setting "$SETTINGS" INFOPLIST_FILE)"
  [[ -n "$INFOPLIST_PATH" ]] \
    || fail "$CONFIG: INFOPLIST_FILE is empty, expected a physical Info.plist path"
  [[ -f "$INFOPLIST_PATH" ]] \
    || fail "$CONFIG: INFOPLIST_FILE '$INFOPLIST_PATH' does not exist on disk"

  ORIENTATIONS="$(/usr/libexec/PlistBuddy -c "Print :UISupportedInterfaceOrientations" "$INFOPLIST_PATH" 2>/dev/null || true)"
  [[ "$ORIENTATIONS" == *"UIInterfaceOrientationPortrait"* ]] \
    || fail "$CONFIG: UISupportedInterfaceOrientations missing UIInterfaceOrientationPortrait"
  [[ "$ORIENTATIONS" != *"Landscape"* ]] \
    || fail "$CONFIG: UISupportedInterfaceOrientations must not include a landscape orientation"
  [[ "$ORIENTATIONS" != *"UpsideDown"* ]] \
    || fail "$CONFIG: UISupportedInterfaceOrientations must not include the upside-down orientation"

  echo "PASS: $CONFIG configuration settings verified"
done

echo "All configurations pass project settings validation."
