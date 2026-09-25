#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VERSION="$(<"$REPO_ROOT/VERSION")"
BUILD_NUMBER="${DRINKSAVER_BUILD_NUMBER:-1}"
VERSION_PATTERN='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)([+-][A-Za-z0-9.-]+)?$'

if [[ "$VERSION" =~ $VERSION_PATTERN ]]; then
  MARKETING_VERSION="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.${BASH_REMATCH[3]}"
else
  echo "Invalid repository VERSION: $VERSION" >&2
  exit 2
fi
[[ "$BUILD_NUMBER" =~ ^[1-9][0-9]*$ ]] || {
  echo "DRINKSAVER_BUILD_NUMBER must be a positive integer" >&2
  exit 2
}

exec xcodebuild "$@" "DRINKSAVER_VERSION=$MARKETING_VERSION" "DRINKSAVER_BUILD_NUMBER=$BUILD_NUMBER"
