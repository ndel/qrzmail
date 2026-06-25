#!/usr/bin/env bash
set -euo pipefail

cookie=/tmp/qrzmail-last-login-cookie.txt
rm -f "$cookie"

curl -sS --max-time 30 -k \
  -c "$cookie" \
  -b "$cookie" \
  -H "Host: mail.qrzmail.com" \
  --data-urlencode "login_user=9n2nk@qrzmail.com" \
  --data-urlencode "pass_user=QrzMail2026Login!" \
  https://127.0.0.1/ >/dev/null

curl -sS --max-time 30 -k \
  -b "$cookie" \
  -H "Host: mail.qrzmail.com" \
  https://127.0.0.1/api/v1/get/last-login/9n2nk%40qrzmail.com/7
echo
