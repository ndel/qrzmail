#!/usr/bin/env bash
set -euo pipefail

cd /opt/mailcow-dockerized

cp data/conf/sogo/sogo.conf data/conf/sogo/sogo.conf.qrzmail.bak
sed -i 's/SOGoPageTitle = ".*";/SOGoPageTitle = "QRZMail Webmail";/' data/conf/sogo/sogo.conf

docker compose restart sogo-mailcow
