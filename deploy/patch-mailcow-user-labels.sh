#!/usr/bin/env bash
set -euo pipefail

cd /opt/mailcow-dockerized

stamp="$(date +%Y%m%d%H%M%S)"
cp data/web/js/site/user.js "data/web/js/site/user.js.qrzmail.$stamp.bak"
cp data/web/inc/functions.inc.php "data/web/inc/functions.inc.php.qrzmail.$stamp.bak"

python3 - <<'PY'
from pathlib import Path

user_js = Path("data/web/js/site/user.js")
text = user_js.read_text()

old = "              var service = '<div class=\"badge bg-secondary\">' + item.service.toUpperCase() + '</div>';\n"
new = """              var serviceName = String(item.service || '').toUpperCase();
              var serviceLabels = {
                MAILCOWUI: 'QRZMail Portal',
                SOGO: 'QRZMail Webmail',
                SSO: 'QRZMail Webmail',
                IMAP: 'IMAP',
                SMTP: 'SMTP',
                POP3: 'POP3'
              };
              var service = '<div class=\"badge bg-secondary\">' + (serviceLabels[serviceName] || escapeHtml(serviceName)) + '</div>';
"""
if old not in text:
    raise SystemExit("Expected service label line not found in user.js")
text = text.replace(old, new)

old = '              var real_rip = item.real_rip.startsWith("Web") ? escapeHtml(item.real_rip) : \'<a href="https://bgp.tools/prefix/\' + escapeHtml(item.real_rip) + \'" target="_blank">\' + escapeHtml(item.real_rip) + "</a>";\n'
new = """              var sourceLabel = item.real_rip.startsWith("Web")
                ? item.real_rip.replace(/^Web\\/EAS\\/Internal/, 'QRZMail Internal')
                : item.real_rip;
              var real_rip = item.real_rip.startsWith("Web") ? escapeHtml(sourceLabel) : '<a href="https://bgp.tools/prefix/' + escapeHtml(sourceLabel) + '" target="_blank">' + escapeHtml(sourceLabel) + "</a>";
"""
if old not in text:
    raise SystemExit("Expected real_rip line not found in user.js")
text = text.replace(old, new)

append = """

$(function () {
  $('[title]').each(function () {
    var title = String($(this).attr('title') || '');
    title = title.replace(/mailcow preferences/ig, 'QRZMail preferences');
    title = title.replace(/mailcow/ig, 'QRZMail');
    $(this).attr('title', title);
  });
  $('[data-bs-original-title]').each(function () {
    var title = String($(this).attr('data-bs-original-title') || '');
    title = title.replace(/mailcow preferences/ig, 'QRZMail preferences');
    title = title.replace(/mailcow/ig, 'QRZMail');
    $(this).attr('data-bs-original-title', title);
  });
});
"""
if "QRZMail preferences" not in text:
    text += append

user_js.write_text(text)

functions = Path("data/web/inc/functions.inc.php")
text = functions.read_text()
text = text.replace("'Web/EAS/Internal (' . $sasl[$k]['real_rip'] . ')'", "'QRZMail Internal (' . $sasl[$k]['real_rip'] . ')'")
functions.write_text(text)
PY

rm -rf data/web/templates/cache/*
docker compose restart php-fpm-mailcow nginx-mailcow
