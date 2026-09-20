#!/bin/bash
# validate-project-settings.sh
# Validates that the iOS project settings match the required configuration.

set -euo pipefail

PROJECT_PATH="ios/DrinkSaver.xcodeproj"
SCHEME="DrinkSaver"
REQUIRED_DEPLOYMENT_TARGET="18.0"
REQUIRED_BUNDLE_ID="im.kak.drinksaver"
REQUIRED_DEVICE_FAMILY="1"  # iPhone only
REQUIRED_ORIENTATIONS="UIInterfaceOrientationPortrait"
REQUIRED_SWIFT_VERSION="6.0"

echo "Validating project settings for $SCHEME..."

# Check that xcodebuild can parse the project
if ! xcodebuild -project "$PROJECT_PATH" -scheme "$SCHEME" -showBuildSettings > /dev/null 2>&1; then
    echo "FAIL: Could not parse project with xcodebuild"
    exit 1
fi

# Get build settings for the app target
SETTINGS=$(xcodebuild -project "$PROJECT_PATH" -scheme "$SCHEME" -showBuildSettings -configuration Debug 2>/dev/null)

# Check deployment target
DEPLOYMENT_TARGET=$(echo "$SETTINGS" | grep "IPHONEOS_DEPLOYMENT_TARGET = " | head -1 | sed 's/.*= //')
if [ "$DEPLOYMENT_TARGET" != "$REQUIRED_DEPLOYMENT_TARGET" ]; then
    echo "FAIL: Deployment target is $DEPLOYMENT_TARGET, expected $REQUIRED_DEPLOYMENT_TARGET"
    exit 1
fi
echo "✓ Deployment target: $DEPLOYMENT_TARGET"

# Check bundle identifier
BUNDLE_ID=$(echo "$SETTINGS" | grep "PRODUCT_BUNDLE_IDENTIFIER = " | head -1 | sed 's/.*= //')
if [ "$BUNDLE_ID" != "$REQUIRED_BUNDLE_ID" ]; then
    echo "FAIL: Bundle identifier is $BUNDLE_ID, expected $REQUIRED_BUNDLE_ID"
    exit 1
fi
echo "✓ Bundle identifier: $BUNDLE_ID"

# Check device family (TARGETED_DEVICE_FAMILY = 1 for iPhone only)
DEVICE_FAMILY=$(echo "$SETTINGS" | grep "TARGETED_DEVICE_FAMILY = " | head -1 | sed 's/.*= //')
if [ "$DEVICE_FAMILY" != "$REQUIRED_DEVICE_FAMILY" ]; then
    echo "FAIL: Device family is $DEVICE_FAMILY, expected $REQUIRED_DEVICE_FAMILY (iPhone only)"
    exit 1
fi
echo "✓ Device family: iPhone only"

# Check Swift version
SWIFT_VERSION=$(echo "$SETTINGS" | grep "SWIFT_VERSION = " | head -1 | sed 's/.*= //')
if [ "$SWIFT_VERSION" != "6" ] && [ "$SWIFT_VERSION" != "6.0" ]; then
    echo "FAIL: Swift version is $SWIFT_VERSION, expected 6.0"
    exit 1
fi
echo "✓ Swift version: $SWIFT_VERSION"

# Check that GENERATE_INFOPLIST_FILE is NO (using physical Info.plist)
GENERATE_INFO_PLIST=$(echo "$SETTINGS" | grep "GENERATE_INFOPLIST_FILE = " | head -1 | sed 's/.*= //')
if [ "$GENERATE_INFO_PLIST" != "NO" ]; then
    echo "FAIL: GENERATE_INFOPLIST_FILE is $GENERATE_INFO_PLIST, expected NO"
    exit 1
fi
echo "✓ Using physical Info.plist"

# Check orientations from Info.plist
INFO_PLIST_PATH="ios/DrinkSaver/Info.plist"
if [ ! -f "$INFO_PLIST_PATH" ]; then
    echo "FAIL: Info.plist not found at $INFO_PLIST_PATH"
    exit 1
fi

ORIENTATIONS=$(plutil -extract UISupportedInterfaceOrientations xml1 -o - "$INFO_PLIST_PATH" 2>/dev/null | grep -A 10 "<array>" | grep "<string>" | sed 's/.*<string>\(.*\)<\/string>.*/\1/' | tr '\n' ' ')
if [[ ! "$ORIENTATIONS" =~ "UIInterfaceOrientationPortrait" ]]; then
    echo "FAIL: Info.plist does not contain required portrait orientation"
    exit 1
fi
# Check that only portrait is supported (no landscape)
if [[ "$ORIENTATIONS" =~ "Landscape" ]]; then
    echo "FAIL: Info.plist contains landscape orientations: $ORIENTATIONS"
    exit 1
fi
echo "✓ Supported orientations: Portrait only"

# Check that Swift 6 language mode is enabled (SWIFT_STRICT_CONCURRENCY = complete)
STRICT_CONCURRENCY=$(echo "$SETTINGS" | grep "SWIFT_STRICT_CONCURRENCY = " | head -1 | sed 's/.*= //')
if [ "$STRICT_CONCURRENCY" != "complete" ]; then
    echo "FAIL: SWIFT_STRICT_CONCURRENCY is $STRICT_CONCURRENCY, expected complete (Swift 6 mode)"
    exit 1
fi
echo "✓ Swift 6 strict concurrency: complete"

# Check configurations exist
CONFIGS=$(xcodebuild -project "$PROJECT_PATH" -list 2>/dev/null | grep -A 10 "Build Configurations:" | grep -v "Build Configurations:" | sed 's/^[[:space:]]*//')
REQUIRED_CONFIGS=("Debug" "Release" "Test")
for CONFIG in "${REQUIRED_CONFIGS[@]}"; do
    if ! echo "$CONFIGS" | grep -q "^$CONFIG$"; then
        echo "FAIL: Missing build configuration: $CONFIG"
        exit 1
    fi
done
echo "✓ Build configurations: Debug, Release, Test"

echo ""
echo "All project settings validated successfully!"
exit 0