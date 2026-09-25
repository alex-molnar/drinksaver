#!/usr/bin/env bash
set -euo pipefail

input="${1:?Usage: assert-release-has-no-fixtures.sh <DrinkSaver.app-or.xcarchive>}"
app="$input"
if [[ -d "$input/Products/Applications/DrinkSaver.app" ]]; then
  app="$input/Products/Applications/DrinkSaver.app"
fi
if [[ ! -d "$app" || ! -f "$app/Info.plist" ]]; then
  printf 'error: expected a built DrinkSaver.app or .xcarchive: %s\n' "$input" >&2
  exit 2
fi

executable_name=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$app/Info.plist")
executable="$app/$executable_name"
if [[ ! -f "$executable" ]]; then
  printf 'error: app executable not found: %s\n' "$executable" >&2
  exit 2
fi

fixture_resource=$(find "$app" -type f -iname '*UITestFixture*' -print -quit)
inspection_dir=$(mktemp -d)
trap 'rm -rf "$inspection_dir"' EXIT
nm_output="$inspection_dir/nm.txt"
strings_output="$inspection_dir/strings.txt"

/usr/bin/nm "$executable" >"$nm_output" 2>/dev/null
/usr/bin/strings "$executable" >"$strings_output"

if /usr/bin/grep -Eiq 'UITestFixture|UI_TESTING' "$nm_output" ||
   /usr/bin/grep -Eiq 'ui-fixture|fixture\.signed-in|ui-fixture-access-token|UITestFixture|UI_TESTING' "$strings_output" ||
   [[ -n "$fixture_resource" ]]; then
  printf 'error: UI fixture code or markers found in Release app: %s\n' "$app" >&2
  exit 1
fi

printf 'Release app contains no UI-test fixture code or markers.\n'
