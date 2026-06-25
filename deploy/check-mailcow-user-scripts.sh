#!/usr/bin/env bash
set -euo pipefail

cookie=/tmp/qrzmail-user-script-cookie.txt
rm -f "$cookie"

curl -sS --max-time 30 -k \
  -c "$cookie" \
  -b "$cookie" \
  -H "Host: mail.qrzmail.com" \
  --data-urlencode "login_user=9n2nk@qrzmail.com" \
  --data-urlencode "pass_user=QrzMail2026Login!" \
  https://127.0.0.1/ >/dev/null

curl -sS --max-time 30 -k \
  -c "$cookie" \
  -b "$cookie" \
  -H "Host: mail.qrzmail.com" \
  https://127.0.0.1/user \
  -o /tmp/qrzmail-user-script-page.html \
  -w "%{http_code} %{url_effective}\n"

head -5 /tmp/qrzmail-user-script-page.html
grep -o '/js/[^"]*' /tmp/qrzmail-user-script-page.html | sort -u
grep -o '/cache/[^"]*' /tmp/qrzmail-user-script-page.html | sort -u
