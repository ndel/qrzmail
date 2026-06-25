#!/usr/bin/env bash
set -euo pipefail

cd /opt/mailcow-dockerized
find data/web -maxdepth 4 -type f \( -name '*api*' -o -name '*.php' \) | sed -n '1,180p'
echo "MATCHES"
grep -RInE "function.*mailbox|case 'edit'|hash_password|password2|edit/mailbox|mailbox\\('edit'" data/web 2>/dev/null | head -220
