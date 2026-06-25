#!/usr/bin/env bash
set -euo pipefail

cd /opt/mailcow-dockerized

echo "USER_INDEX"
sed -n '1,140p' data/web/templates/user_index.twig
echo "ADMIN_INDEX"
sed -n '1,110p' data/web/templates/admin_index.twig
echo "BASE"
sed -n '1,520p' data/web/templates/base.twig | grep -nE 'Version|mailcow|footer|github|cow|logo' || true
echo "FOOTERS"
find data/web/templates -maxdepth 2 -type f \( -name '*footer*' -o -name 'base.twig' \) -print
