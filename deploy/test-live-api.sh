#!/usr/bin/env bash
set -euo pipefail

tmp_cookie=/tmp/qrzmail-cookie-live.txt
email="owner$(date +%s)@example.com"
password=TestPass12345

echo "email=$email"
curl -i -sS --max-time 20 \
  -k \
  -c "$tmp_cookie" \
  -H "Host: qrzmail.com" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Owner\",\"email\":\"$email\",\"password\":\"$password\"}" \
  https://127.0.0.1/api/account/register
echo

curl -i -sS --max-time 20 \
  -k \
  -b "$tmp_cookie" \
  -H "Host: qrzmail.com" \
  https://127.0.0.1/api/account/me
echo

curl -i -sS --max-time 20 \
  -k \
  -b "$tmp_cookie" \
  -H "Host: qrzmail.com" \
  https://127.0.0.1/api/domains
echo
