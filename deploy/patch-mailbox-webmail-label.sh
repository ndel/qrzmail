#!/usr/bin/env bash
set -euo pipefail

cd /opt/mailcow-dockerized

stamp="$(date +%Y%m%d%H%M%S)"
cp data/web/js/site/mailbox.js "data/web/js/site/mailbox.js.qrzmail.$stamp.bak"

python3 - <<'PY'
from pathlib import Path

path = Path("data/web/js/site/mailbox.js")
text = path.read_text()
text = text.replace("title: 'SOGO',", "title: 'Webmail',")
path.write_text(text)
PY

rm -rf data/web/templates/cache/*
docker compose restart php-fpm-mailcow nginx-mailcow
