#!/usr/bin/env bash
set -euo pipefail

cookie=/tmp/qrzmail-sogo-check-cookie.txt
rm -f "$cookie"

curl -sS --max-time 30 -k \
  -c "$cookie" \
  -b "$cookie" \
  -H "Host: mail.qrzmail.com" \
  --data-urlencode "email=9n2nk@qrzmail.com" \
  --data-urlencode "password=QrzMail2026Login!" \
  https://127.0.0.1/qrzmail-sogo-login.php >/dev/null

curl -sS --max-time 30 -k -L \
  -c "$cookie" \
  -b "$cookie" \
  -H "Host: mail.qrzmail.com" \
  https://127.0.0.1/SOGo/so/ \
  -o /tmp/sogo-page.html \
  -w "%{http_code} %{url_effective}\n"

grep -o "custom-sogo.js\|QRZMail Webmail" /tmp/sogo-page.html | head
