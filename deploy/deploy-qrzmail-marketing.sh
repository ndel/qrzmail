#!/usr/bin/env bash
set -euo pipefail

# Deploy the QRZMail Marketing App
#
# The marketing app is a standalone Next.js app at /opt/qrzmail-marketing
# that runs as a separate Docker container (qrzmail-marketing).
# It is reverse-proxied by nginx at https://qrzmail.com/marketing
#
# Prerequisites:
#   1. Run deploy/extract-marketing-app.sh ONCE to set up /opt/qrzmail-marketing
#   2. Ensure mailcow-qrzmail-marketing.conf is deployed to nginx-mailcow
#
# Usage:
#   ./deploy-qrzmail-marketing.sh

MARKETING_DIR=/opt/qrzmail-marketing

echo "=== Deploying QRZMail Marketing App ==="

if [ ! -d "$MARKETING_DIR" ]; then
  echo "ERROR: $MARKETING_DIR does not exist."
  echo "Run deploy/extract-marketing-app.sh first to set up the marketing app."
  exit 1
fi

# Pull latest code if it's a git repo
if [ -d "$MARKETING_DIR/.git" ]; then
  echo "Pulling latest code..."
  cd "$MARKETING_DIR"
  git pull origin main
else
  echo "Not a git repo. Re-extract from main qrzmail repo..."
  cd "$(dirname "$0")/.."
  MARKETING_SRC=$(pwd)/marketing-app
  if [ -d "$MARKETING_SRC" ]; then
    rsync -av --exclude='node_modules' --exclude='.next' --exclude='.data' \
      "$MARKETING_SRC/" "$MARKETING_DIR/"
  else
    echo "WARNING: Cannot find marketing-app source. Deploying existing code."
  fi
fi

# Ensure data directory exists and has correct permissions
mkdir -p "$MARKETING_DIR/data"
chown -R 1001:1001 "$MARKETING_DIR/data"

# Build and restart
cd "$MARKETING_DIR"
echo "Building and restarting marketing container..."
docker compose up -d --build

echo ""
echo "=== Deployment Complete ==="
echo "Marketing app is at https://qrzmail.com/marketing"
echo ""
echo "Check logs: docker logs -f qrzmail-marketing"
