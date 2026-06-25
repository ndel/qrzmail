#!/usr/bin/env bash
set -euo pipefail

cd /opt/mailcow-dockerized
grep -RInE 'function check_login|mailcow_cc_username|pending_pw_update|login_user|\$_SESSION.*mailcow_cc' data/web/inc data/web 2>/dev/null | head -160
