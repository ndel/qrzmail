#!/usr/bin/env bash
# Fix existing mailboxes that were created without sogo_access, imap_access, smtp_access flags.
# Run this once to enable send/receive for mailboxes created before the code fix.
set -euo pipefail

cd /opt/qrzmail-web
api_key="$(grep '^MAILCOW_API_KEY=' .env | cut -d= -f2-)"

echo "Fetching all mailboxes from Mailcow..."
response=$(curl -sS --max-time 60 -k \
  -H "X-API-Key: $api_key" \
  https://127.0.0.1/api/v1/get/mailbox/all)

echo "$response" | jq -c '.[] | {username: .username, name: .name}' | while read -r mailbox; do
  username=$(echo "$mailbox" | jq -r '.username')
  name=$(echo "$mailbox" | jq -r '.name')
  echo "Fixing: $username ($name)"

  curl -sS --max-time 30 -k \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $api_key" \
    -d "{\"items\":[\"$username\"],\"attr\":{\"sogo_access\":\"1\",\"imap_access\":\"1\",\"smtp_access\":\"1\",\"active\":\"1\"}}" \
    https://127.0.0.1/api/v1/edit/mailbox >/dev/null

  echo "  -> Done"
done

echo "All mailboxes updated."
