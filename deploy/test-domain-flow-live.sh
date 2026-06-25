#!/usr/bin/env bash
set -euo pipefail

cookie=/tmp/qrzmail-domain-flow-cookie.txt
data_file=/opt/qrzmail-web/data/qrzmail.json
stamp=$(date +%s)
email="owner-${stamp}@example.com"
password="TestPass12345"
domain="flow-${stamp}.example.com"

cleanup() {
  if [ -f "$data_file" ]; then
    tmp=$(mktemp)
    jq --arg email "$email" '
      (.users[]? | select(.email == $email) | .id) as $owner
      | if $owner then
          .users = (.users | map(select(.id != $owner)))
          | .domains = (.domains | map(select(.ownerId != $owner)))
          | .mailboxes = (.mailboxes | map(select(.ownerId != $owner)))
        else
          .
        end
    ' "$data_file" > "$tmp"
    cat "$tmp" > "$data_file"
    rm -f "$tmp"
    chown 1001:1001 "$data_file"
  fi
  rm -f "$cookie"
}
trap cleanup EXIT

request() {
  local method=$1
  local path=$2
  local body=${3:-}
  local output
  if [ -n "$body" ]; then
    output=$(curl -sS -k -w '\n%{http_code}' -c "$cookie" -b "$cookie" \
      -H 'Host: qrzmail.com' \
      -H 'Content-Type: application/json' \
      -X "$method" \
      -d "$body" \
      "https://127.0.0.1${path}")
  else
    output=$(curl -sS -k -w '\n%{http_code}' -c "$cookie" -b "$cookie" \
      -H 'Host: qrzmail.com' \
      -X "$method" \
      "https://127.0.0.1${path}")
  fi

  printf '%s' "$output" | tail -n 1
  printf '\n'
  printf '%s' "$output" | sed '$d'
  printf '\n'
}

echo "register"
request POST /api/account/register "{\"name\":\"Flow Test\",\"email\":\"$email\",\"password\":\"$password\"}"

echo "add domain"
request POST /api/domains "{\"domain\":\"$domain\"}"

echo "list domains"
request GET /api/domains

domain_id=$(jq -r --arg email "$email" '
  (.users[] | select(.email == $email) | .id) as $owner
  | .domains[] | select(.ownerId == $owner) | .id
' "$data_file")

echo "verify without DNS"
request POST "/api/domains/${domain_id}/verify"

echo "mailbox before active"
request POST /api/mailboxes "{\"domainId\":\"$domain_id\",\"localPart\":\"support\",\"name\":\"Support\",\"password\":\"Mailbox2026x\",\"quotaMb\":1024}"
