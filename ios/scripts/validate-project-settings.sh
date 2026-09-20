#!/bin/bash
set -euo pipefail

# Script to validate Xcode project settings
# Usage: ./validate-project-settings.sh -project <project_path> -scheme <scheme_name> -destination <destination>

PROJECT=""
SCHEME=""
DESTINATION=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -project)
            PROJECT="$2"
            shift 2
            ;;
        -scheme)
            SCHEME="$2"
            shift 2
            ;;
        -destination)
            DESTINATION="$2"
            shift 2
            ;;
        *)
            echo "Unknown parameter: $1"
            exit 1
            ;;
    esac
done

if [[ -z "$PROJECT" || -z "$SCHEME" || -z "$DESTINATION" ]]; then
    echo "Usage: $0 -project <project_path> -scheme <scheme_name> -destination <destination>"
    exit 1
fi

echo "Validating project settings for $PROJECT"
echo "Scheme: $SCHEME"
echo "Destination: $DESTINATION"

# Show build settings to verify configuration
xcodebuild -project "$PROJECT" -scheme "$SCHEME" -destination "$DESTINATION" -showBuildSettings

echo "Validation completed successfully"