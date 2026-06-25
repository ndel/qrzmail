#!/usr/bin/env bash
set -euo pipefail

email="${1:?email required}"
password="${2:?password required}"

echo "JSON userName"
curl -i -sS --max-time 20 -k \
  -H "Host: mail.qrzmail.com" \
  -H "Content-Type: application/json;charset=utf-8" \
  -H "Accept: application/json, text/plain, */*" \
  -d "{\"userName\":\"$email\",\"password\":\"$password\",\"rememberLogin\":0}" \
  https://127.0.0.1/SOGo/connect
echo

echo "JSON username"
curl -i -sS --max-time 20 -k \
  -H "Host: mail.qrzmail.com" \
  -H "Content-Type: application/json;charset=utf-8" \
  -H "Accept: application/json, text/plain, */*" \
  -d "{\"username\":\"$email\",\"password\":\"$password\",\"rememberLogin\":0}" \
  https://127.0.0.1/SOGo/connect
echo

echo "FORM"
curl -i -sS --max-time 20 -k \
  -H "Host: mail.qrzmail.com" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "userName=$email&password=$password&rememberLogin=0" \
  https://127.0.0.1/SOGo/connect
echo
