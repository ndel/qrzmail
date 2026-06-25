#!/bin/sh
set -eu

cd /opt/mailcow-dockerized

template="data/conf/nginx/templates/sites-default.conf.j2"

perl -0pi -e 's#location \^~ /qrzmail-sso/ \{.*?\n\}\n\nlocation / \{#location ^~ /qrzmail-sso/ {\n    proxy_pass http://qrzmail-web:3000;\n    proxy_http_version 1.1;\n    proxy_set_header Host \$host;\n    proxy_set_header X-Real-IP \$remote_addr;\n    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;\n    proxy_set_header X-Forwarded-Proto https;\n    proxy_read_timeout 300;\n}\n\nlocation / {#s' "$template"

grep -n -A12 -B2 "qrzmail-sso" "$template"
