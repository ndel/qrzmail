#!/usr/bin/env bash
set -euo pipefail

tmp_cookie=/tmp/qrzmail-webmail-cookie.txt
local_part="test$(date +%s)"
password=TestPass12345
email="${local_part}@qrzmail.com"

echo "email=$email"

echo "SIGNUP"
curl -i -sS --max-time 30 -k \
  -H "Host: qrzmail.com" \
  -H "Content-Type: application/json" \
  -d "{\"localPart\":\"$local_part\",\"name\":\"Login Test\",\"password\":\"$password\"}" \
  https://127.0.0.1/api/signup
echo

echo "IMAP_LOGIN_API"
curl -i -sS --max-time 30 -k \
  -H "Host: qrzmail.com" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
  https://127.0.0.1/api/login
echo

echo "SSO"
curl -i -sS --max-time 30 -k \
  -c "$tmp_cookie" \
  -H "Host: mail.qrzmail.com" \
  -d "email=$email&password=$password" \
  https://127.0.0.1/qrzmail-sso/login
echo
