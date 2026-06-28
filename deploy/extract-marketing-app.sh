#!/usr/bin/env bash
set -euo pipefail

# Extract the marketing app from the main qrzmail repo into its own standalone directory.
# This script is meant to be run ONCE on the server to set up the marketing app
# as an independent project. After this, the marketing app can be deployed
# independently via its own git repo or by re-running this script.
#
# Usage:
#   ./extract-marketing-app.sh [destination]
#
# Default destination: /opt/qrzmail-marketing

DEST="${1:-/opt/qrzmail-marketing}"
SOURCE_REPO="/opt/qrzmail-web"

echo "=== Extracting Marketing App ==="
echo "Source: $SOURCE_REPO/marketing-app"
echo "Destination: $DEST"

if [ ! -d "$SOURCE_REPO" ]; then
  echo "ERROR: Source repo not found at $SOURCE_REPO"
  echo "Please clone the main qrzmail repo first:"
  echo "  git clone https://github.com/your-org/qrzmail.git $SOURCE_REPO"
  exit 1
fi

# Create destination
mkdir -p "$DEST"

# Copy marketing app files (excluding node_modules, .next, etc.)
rsync -av --exclude='node_modules' --exclude='.next' --exclude='.data' \
  "$SOURCE_REPO/marketing-app/" "$DEST/"

# Create data directory
mkdir -p "$DEST/data"

# Create .env if it doesn't exist
if [ ! -f "$DEST/.env" ]; then
  cat > "$DEST/.env" << 'EOF'
BASE_URL=https://qrzmail.com
SESSION_SECRET=352dc639eff7427eb4c44854665c194f307147d19339945735477dc1a68a4f8a
MARKETING_DATA_DIR=/data
MARKETING_POLL_INTERVAL=10000
MARKETING_BATCH_SIZE=50
MARKETING_IMAP_INTERVAL=60000
EOF
  echo "Created default .env file"
fi

# Fix permissions
chown -R 1001:1001 "$DEST/data"

echo ""
echo "=== Extraction Complete ==="
echo "Marketing app is now at: $DEST"
echo ""
echo "To deploy, run:"
echo "  cd $DEST && docker compose up -d --build"
echo ""
echo "To update later, re-run this script or set up a separate git repo:"
echo "  cd $DEST && git init && git remote add origin <your-marketing-repo-url>"
