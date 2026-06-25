#!/usr/bin/env bash
set -euo pipefail

email="${1:?email required}"
password="${2:?password required}"
cookie=/tmp/qrzmail-sogo-bridge-cookie.txt
rm -f "$cookie"

echo "BRIDGE"
curl -i -sS --max-time 30 -k \
  -c "$cookie" \
  -b "$cookie" \
  -H "Host: mail.qrzmail.com" \
  --data-urlencode "email=$email" \
  --data-urlencode "password=$password" \
  https://127.0.0.1/qrzmail-sogo-login.php | sed -n "1,35p"

echo "SOGO"
curl -i -sS --max-time 30 -k \
  -c "$cookie" \
  -b "$cookie" \
  -H "Host: mail.qrzmail.com" \
  https://127.0.0.1/SOGo/so/ | sed -n "1,45p"

echo "FINAL_STATUS"
curl -sS --max-time 30 -k -L \
  -o /tmp/qrzmail-sogo-final.html \
  -w "%{http_code} %{url_effective}\n" \
  -c "$cookie" \
  -b "$cookie" \
  -H "Host: mail.qrzmail.com" \
  https://127.0.0.1/SOGo/so/
