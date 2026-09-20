#!/usr/bin/env bash
set -euo pipefail

# Validate iOS project settings for DrinkSaver
# This script checks that the built app matches the required configuration.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}/.."
XCODEBUILD="xcodebuild"

echo "=== Validating iOS Project Settings ==="

# Check deployment target
DEPLOYMENT_TARGET=$("${XCODEBUILD}" -showBuildSettings -project "${PROJECT_DIR}/DrinkSaver.xcodeproj" 2>/dev/null | grep -i "IPHONEOS_DEPLOYMENT_TARGET" | awk '{print $3}' | tr -d '"')
if [ "${DEPLOYMENT_TARGET}" != "18.0" ]; then
    echo "FAIL: Deployment target is ${DEPLOYMENT_TARGET}, expected 18.0"
    exit 1
fi
echo "PASS: Deployment target is ${DEPLOYMENT_TARGET}"

# Check device family
DEVICE_FAMILY=$("${XCODEBUILD}" -showBuildSettings -project "${PROJECT_DIR}/DrinkSaver.xcodeproj" 2>/dev/null | grep -i "IPHONEOS_DEVICE_FAMILY" | awk '{print $3}')
if [ "${DEVICE_FAMILY}" != "1" ]; then
    echo "FAIL: Device family is ${DEVICE_FAMILY}, expected 1 (iPhone only)"
    exit 1
fi
echo "PASS: Device family is ${DEVICE_FAMILY}"

# Check supported orientations
ORIENTATIONS=$("${XCODEBUILD}" -showBuildSettings -project "${PROJECT_DIR}/DrinkSaver.xcodeproj" 2>/dev/null | grep -i "IPHONEOS_SUPPORTED_ORIENTATIONS" | awk '{print $3}')
if [ "${ORIENTATIONS}" != "PORTRAIT" ]; then
    echo "FAIL: Supported orientations is ${ORIENTATIONS}, expected PORTRAIT"
    exit 1
fi
echo "PASS: Supported orientations is ${ORIENTATIONS}"

# Check bundle ID
BUNDLE_ID=$("${XCODEBUILD}" -showBuildSettings -project "${PROJECT_DIR}/DrinkSaver.xcodeproj" 2>/dev/null | grep -i "PRODUCT_BUNDLE_IDENTIFIER" | awk '{print $3}' | tr -d '"')
if [ "${BUNDLE_ID}" != "im.kak.drinksaver" ]; then
    echo "FAIL: Bundle ID is ${BUNDLE_ID}, expected im.kak.drinksaver"
    exit 1
fi
echo "PASS: Bundle ID is ${BUNDLE_ID}"

# Check Swift 6 mode
SWIFT_VERSION=$("${XCODEBUILD}" -showBuildSettings -project "${PROJECT_DIR}/DrinkSaver.xcodeproj" 2>/dev/null | grep -i "SWIFT_VERSION" | awk '{print $3}')
if [ "${SWIFT_VERSION}" != "6" ]; then
    echo "FAIL: Swift version is ${SWIFT_VERSION}, expected 6"
    exit 1
fi
echo "PASS: Swift version is ${SWIFT_VERSION}"

# Check physical Info.plist usage
GENERATE_INFOPLIST=$("${XCODEBUILD}" -showBuildSettings -project "${PROJECT_DIR}/DrinkSaver.xcodeproj" 2>/dev/null | grep "GENERATE_INFOPLIST_FILE" | awk '{print $3}')
if [ "${GENERATE_INFOPLIST}" != "NO" ]; then
    echo "FAIL: GENERATE_INFOPLIST_FILE is ${GENERATE_INFOPLIST}, expected NO"
    exit 1
fi
echo "PASS: GENERATE_INFOPLIST_FILE is ${GENERATE_INFOPLIST}"

echo ""
echo "=== All project settings validation passed ==="