#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT
mkdir -p "$TEMP_DIR/ios/scripts" "$TEMP_DIR/bin"
cp "$SCRIPT_DIR/xcodebuild.sh" "$TEMP_DIR/ios/scripts/xcodebuild.sh"
cat > "$TEMP_DIR/bin/xcodebuild" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$@" > "$XCODEBUILD_CAPTURE"
STUB
chmod +x "$TEMP_DIR/bin/xcodebuild"

run_with_version() {
  printf '%s\n' "$1" > "$TEMP_DIR/VERSION"
  XCODEBUILD_CAPTURE="$TEMP_DIR/arguments" PATH="$TEMP_DIR/bin:$PATH" \
    "$TEMP_DIR/ios/scripts/xcodebuild.sh" build
}

run_with_version 4.3.0-rc.1
grep -Fxq 'DRINKSAVER_VERSION=4.3.0' "$TEMP_DIR/arguments"
grep -Fxq 'DRINKSAVER_BUILD_NUMBER=1' "$TEMP_DIR/arguments"
run_with_version 4.3.0
grep -Fxq 'DRINKSAVER_VERSION=4.3.0' "$TEMP_DIR/arguments"

if run_with_version 04.3.0; then
  echo 'Expected invalid VERSION to fail' >&2
  exit 1
fi

echo 'PASS: Xcode wrapper normalizes prerelease versions and rejects invalid versions'
