#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

swiftc -module-cache-path "$WORK_DIR/module-cache" "$SCRIPT_DIR/generate-app-artwork.swift" -o "$WORK_DIR/generate-app-artwork"
"$WORK_DIR/generate-app-artwork" \
  "$REPO_ROOT/web/public/favicon.svg" \
  "$REPO_ROOT/ios/DrinkSaver/Resources/Assets.xcassets"
