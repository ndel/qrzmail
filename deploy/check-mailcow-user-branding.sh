#!/usr/bin/env bash
set -euo pipefail

cookie=/tmp/qrzmail-mailcow-user-cookie.txt
rm -f "$cookie"

curl -sS --max-time 30 -k \
  -c "$cookie" \
  -b "$cookie" \
  -H "Host: mail.qrzmail.com" \
  --data-urlencode "login_user=9n2nk@qrzmail.com" \
  --data-urlencode "pass_user=QrzMail2026Login!" \
  https://127.0.0.1/ >/tmp/qrzmail-user-login.html

curl -sS --max-time 30 -k \
  -c "$cookie" \
  -b "$cookie" \
  -H "Host: mail.qrzmail.com" \
  https://127.0.0.1/user \
  -o /tmp/qrzmail-user-page.html

grep -E "QRZMail|2026-05c|github.com/mailcow|cow_mailcow|mailcow-logo|version_tag|project_url" /tmp/qrzmail-user-page.html | head -80
