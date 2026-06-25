#!/usr/bin/env bash
set -euo pipefail

docker exec mailcowdockerized-sogo-mailcow-1 sh -lc '
  grep -RInE "SOGo version|version 5|5\\.12|About|Preferences" \
    /usr/lib/GNUstep/SOGo \
    /usr/share/sogo \
    /usr/local/lib/GNUstep/SOGo \
    /etc/sogo 2>/dev/null | head -160
'
