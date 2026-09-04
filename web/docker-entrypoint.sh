#!/bin/sh
set -e

# This script is used to start nginx
# API_URL is now baked in at build time via VITE_API_URL build argument

echo "Starting frontend..."

# Execute the CMD
exec "$@"
