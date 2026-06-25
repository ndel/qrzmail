#!/usr/bin/env bash
set -euo pipefail

cd /opt/mailcow-dockerized

stamp="$(date +%Y%m%d%H%M%S)"
cp data/web/inc/functions.inc.php "data/web/inc/functions.inc.php.service-labels.$stamp.bak"

python3 - <<'PY'
from pathlib import Path

path = Path("data/web/inc/functions.inc.php")
text = path.read_text()

needle = """          if (!filter_var($sasl[$k]['real_rip'], FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            $sasl[$k]['real_rip'] = 'QRZMail Internal (' . $sasl[$k]['real_rip'] . ')';
          }
"""
replacement = """          if (!filter_var($sasl[$k]['real_rip'], FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            $sasl[$k]['real_rip'] = 'QRZMail Internal (' . $sasl[$k]['real_rip'] . ')';
          }
          if ($sasl[$k]['service'] == 'MAILCOWUI') {
            $sasl[$k]['service'] = 'QRZMail Portal';
          }
          elseif ($sasl[$k]['service'] == 'SOGO' || $sasl[$k]['service'] == 'SSO') {
            $sasl[$k]['service'] = 'QRZMail Webmail';
          }
"""
if replacement in text:
    pass
elif needle in text:
    text = text.replace(needle, replacement, 1)
else:
    raise SystemExit("Expected last_login real_rip block not found")

path.write_text(text)
PY

rm -rf data/web/templates/cache/*
docker compose restart php-fpm-mailcow nginx-mailcow
