#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VERSION="$(<"$REPO_ROOT/VERSION")"
BUILD_NUMBER="${DRINKSAVER_BUILD_NUMBER:-1}"

[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([+-][A-Za-z0-9.-]+)?$ ]] || {
  echo "Invalid repository VERSION: $VERSION" >&2
  exit 2
}
[[ "$BUILD_NUMBER" =~ ^[1-9][0-9]*$ ]] || {
  echo "DRINKSAVER_BUILD_NUMBER must be a positive integer" >&2
  exit 2
}

exec xcodebuild "$@" "DRINKSAVER_VERSION=$VERSION" "DRINKSAVER_BUILD_NUMBER=$BUILD_NUMBER"
