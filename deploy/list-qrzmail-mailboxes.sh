#!/usr/bin/env bash
set -euo pipefail

cd /opt/mailcow-dockerized
set -a
. ./mailcow.conf
set +a

docker compose exec -T mysql-mailcow \
  mysql -u mailcow -p"$DBPASS" mailcow \
  -e "select username, active, JSON_EXTRACT(attributes, '$.force_pw_update') as force_pw_update from mailbox where domain='qrzmail.com' order by username;"
