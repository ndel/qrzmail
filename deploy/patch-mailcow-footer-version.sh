#!/usr/bin/env bash
set -euo pipefail

cd /opt/mailcow-dockerized

stamp="$(date +%Y%m%d%H%M%S)"
cp data/web/templates/base.twig "data/web/templates/base.twig.footer.$stamp.bak"

perl -0pi -e 's#\s*\{% if mailcow_cc_username and mailcow_info\.mailcow_branch\|lower == "master" and mailcow_info\.version_tag\|default %\}\s*<span class="version">.*?\{% endif %\}\s*\{% if mailcow_cc_username and mailcow_info\.mailcow_branch\|lower == "nightly" and mailcow_info\.version_tag\|default %\}\s*<span class="version">.*?\{% endif %\}\s*\{% if mailcow_cc_username and mailcow_info\.mailcow_branch\|lower == "legacy" and mailcow_info\.version_tag\|default %\}\s*<span class="version">.*?\{% endif %\}#\n  {% if mailcow_cc_username %}\n  <span class="version">QRZMail Webmail<br><span style="text-align:right;display:block;">QRZMail 2026</span></span>\n  {% endif %}#gs' \
  data/web/templates/base.twig

rm -rf data/web/templates/cache/*
docker compose restart php-fpm-mailcow nginx-mailcow
