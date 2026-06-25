#!/usr/bin/env bash
set -euo pipefail

mailbox="${1:?mailbox required}"
password="${2:?password required}"

cd /opt/qrzmail-web
api_key="$(grep '^MAILCOW_API_KEY=' .env | cut -d= -f2-)"

curl -sS --max-time 30 -k \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $api_key" \
  -d "{\"items\":[\"$mailbox\"],\"attr\":{\"password\":\"$password\",\"password2\":\"$password\",\"force_pw_update\":\"0\",\"active\":\"1\",\"sogo_access\":\"1\",\"imap_access\":\"1\",\"smtp_access\":\"1\"}}" \
  https://127.0.0.1/api/v1/edit/mailbox
echo
