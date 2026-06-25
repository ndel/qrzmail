#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/qrzmail-web
SESSION_SECRET_VALUE=352dc639eff7427eb4c44854665c194f307147d19339945735477dc1a68a4f8a

mkdir -p "$APP_DIR/data"

if [ -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env" /tmp/qrzmail-web.env
else
  touch /tmp/qrzmail-web.env
fi

# Git pull instead of tarball extraction
cd "$APP_DIR"
git pull origin main

# Restore .env (preserved across pulls)
mv /tmp/qrzmail-web.env "$APP_DIR/.env"

if ! grep -q '^SESSION_SECRET=' "$APP_DIR/.env"; then
  printf '\nSESSION_SECRET=%s\n' "$SESSION_SECRET_VALUE" >> "$APP_DIR/.env"
fi

if ! grep -q '^QRZMAIL_DATA_DIR=' "$APP_DIR/.env"; then
  printf 'QRZMAIL_DATA_DIR=/data\n' >> "$APP_DIR/.env"
fi

chown -R 1001:1001 "$APP_DIR/data"

cd "$APP_DIR"
docker compose -f docker-compose.prod.yml up -d --build qrzmail-web
