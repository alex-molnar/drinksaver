#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WEB_DIR="${1:-$REPO_ROOT/ios/Reference/web}"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ios-visual-parity.XXXXXX")"
NATIVE_DIR="$TEMP_DIR/native"
if [[ "${IOS_REFERENCE_REGENERATE:-0}" == "1" ]]; then
  NATIVE_DIR="$REPO_ROOT/ios/Reference/native"
fi
CREATED_SIMULATORS=()
CAPTURE_DEVICE_IDS=()
cleanup() {
  for simulator in "${CREATED_SIMULATORS[@]}"; do xcrun simctl delete "$simulator" >/dev/null 2>&1 || true; done
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

command -v jq >/dev/null || { echo "jq is required to read Xcode attachment manifests" >&2; exit 2; }
mkdir -p "$NATIVE_DIR"
WEB_DIR="$(cd "$WEB_DIR" && pwd)"

capture_device() {
  local device="$1" viewport="$2" type="$3"
  local result="$TEMP_DIR/$viewport.xcresult" export="$TEMP_DIR/$viewport"
  local runtime="com.apple.CoreSimulator.SimRuntime.iOS-27-0"
  local device_id
  device_id="$(xcrun simctl list devices -j | jq -r --arg runtime "$runtime" --arg name "$device" '.devices[$runtime][]? | select(.name == $name and .isAvailable) | .udid' | head -n 1)"
  if [[ -z "$device_id" ]]; then
    device_id="$(xcrun simctl create "DrinkSaver parity $viewport" "$type" "$runtime")"
    CREATED_SIMULATORS+=("$device_id")
  fi
  CAPTURE_DEVICE_IDS+=("$device_id")
  echo "Capturing native references on $device ($viewport)"
  "$SCRIPT_DIR/xcodebuild.sh" test \
    -project "$REPO_ROOT/ios/DrinkSaver.xcodeproj" \
    -scheme DrinkSaver \
    -testPlan VisualCapture \
    -destination "platform=iOS Simulator,id=$device_id" \
    -parallel-testing-enabled NO \
    -only-testing:DrinkSaverUITests/VisualCaptureUITests/testCaptureReferenceMatrix \
    -resultBundlePath "$result"
  xcrun xcresulttool export attachments --path "$result" --output-path "$export" >/dev/null
  local state theme name file
  for state in quick-ready quick-loading quick-error history-populated history-empty history-error recs-ready recs-empty recs-error add-root; do
    for theme in dark light; do
      name="$state-$theme-$viewport"
      file="$(jq -r --arg wanted "$name" '.[]?.attachments[]? | select(.suggestedHumanReadableName | split("_0_")[0] == $wanted) | .exportedFileName' "$export/manifest.json" | head -n 1)"
      [[ -n "$file" && -f "$export/$file" ]] || { echo "Missing Xcode screenshot attachment: $name" >&2; exit 1; }
      cp "$export/$file" "$NATIVE_DIR/$name.png"
    done
  done
}

capture_device "iPhone SE (3rd generation)" 375x667 com.apple.CoreSimulator.SimDeviceType.iPhone-SE-3rd-generation
capture_device "iPhone 13 mini" 375x812 com.apple.CoreSimulator.SimDeviceType.iPhone-13-mini
capture_device "iPhone 16 Pro Max" 440x956 com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro-Max

echo "Comparing all 60 frozen web/native screenshots"
comparison_result="$TEMP_DIR/comparison.xcresult"
comparison_status=0
"$SCRIPT_DIR/xcodebuild.sh" test \
  -project "$REPO_ROOT/ios/DrinkSaver.xcodeproj" \
  -scheme DrinkSaver \
  -testPlan VisualParity \
  -destination "platform=iOS Simulator,id=${CAPTURE_DEVICE_IDS[1]}" \
  -parallel-testing-enabled NO \
  -only-testing:DrinkSaverTests/VisualParityTests/testFrozenReferenceMatrixIsCompleteAndComparable \
  -resultBundlePath "$comparison_result" \
  "WEB_REFERENCE_DIR=$WEB_DIR" "NATIVE_REFERENCE_DIR=$NATIVE_DIR" || comparison_status=$?

report_export="$TEMP_DIR/report"
xcrun xcresulttool export attachments --path "$comparison_result" --output-path "$report_export" >/dev/null
report_file="$(jq -r '.[]?.attachments[]? | select(.suggestedHumanReadableName | startswith("iOS visual parity comparison report")) | .exportedFileName' "$report_export/manifest.json" | head -n 1)"
if [[ -n "$report_file" && -f "$report_export/$report_file" ]]; then
  echo "Visual parity comparison report:"
  cat "$report_export/$report_file"
fi
exit "$comparison_status"
