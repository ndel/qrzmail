#!/usr/bin/env bash
set -euo pipefail

docker exec mailcowdockerized-sogo-mailcow-1 sh -lc '
  echo "FILES"
  find /etc /var/lib/sogo -maxdepth 3 \( -iname "*sogo*" -o -name "*.conf" \) 2>/dev/null | sort | head -80
  echo "ACTIVE_CONFIG"
  for file in /etc/sogo/sogo.conf /etc/SOGo/sogo.conf /etc/sogo/conf.d/*; do
    [ -f "$file" ] || continue
    echo "--- $file"
    sed -n "1,320p" "$file"
  done
  echo "GNUSTEP_DEFAULTS"
  sed -n "1,420p" /var/lib/sogo/GNUstep/Defaults/sogod.plist 2>/dev/null || true
'
