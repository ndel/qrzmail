#!/usr/bin/env bash
set -euo pipefail

cd /opt/mailcow-dockerized

stamp="$(date +%Y%m%d%H%M%S)"
cp data/web/templates/base.twig "data/web/templates/base.twig.qrzmail.$stamp.bak"
cp data/web/templates/user_index.twig "data/web/templates/user_index.twig.qrzmail.$stamp.bak"
cp data/web/templates/admin_index.twig "data/web/templates/admin_index.twig.qrzmail.$stamp.bak"

perl -0pi -e 's#<div class="text-center mailcow-logo mb-4">\s*<img class="main-logo" src="\{\{ logo\|default\('\''/img/cow_mailcow\.svg'\''\) \}\}" alt="mailcow">\s*<img class="main-logo-dark" src="\{\{ logo_dark\|default\('\''/img/cow_mailcow\.svg'\''\) \}\}" alt="mailcow-logo-dark">\s*</div>#<div class="text-center mailcow-logo mb-4 qrzmail-login-logo"><div class="qrzmail-login-mark">Q</div><div class="qrzmail-login-name">QRZMail</div></div>#gs' \
  data/web/templates/user_index.twig \
  data/web/templates/admin_index.twig

perl -0pi -e 's#<a class="navbar-brand" href="/">\s*<img class="main-logo" alt="mailcow-logo" src="\{\{ logo\|default\('\''/img/cow_mailcow\.svg'\''\) \}\}">\s*<img class="main-logo-dark" alt="mailcow-logo-dark" src="\{\{ logo_dark\|default\('\''/img/cow_mailcow\.svg'\''\) \}\}">\s*</a>#<a class="navbar-brand qrzmail-navbar-brand" href="/"><span class="qrzmail-navbar-mark">Q</span><span class="qrzmail-navbar-name">QRZMail</span></a>#gs' \
  data/web/templates/base.twig

perl -0pi -e "s#version_tag: '\\{\\{ mailcow_info.version_tag \\}\\}'#version_tag: 'QRZMail 2026'#g;
  s#last_version_tag: '\\{\\{ mailcow_info.last_version_tag \\}\\}'#last_version_tag: 'QRZMail 2026'#g;
  s#updatedAt: '\\{\\{ mailcow_info.updated_at \\}\\}'#updatedAt: ''#g;
  s#project_url: '\\{\\{ mailcow_info.git_project_url \\}\\}'#project_url: 'https://qrzmail.com'#g;
  s#project_owner: '\\{\\{ mailcow_info.git_owner \\}\\}'#project_owner: 'QRZMail'#g;
  s#project_repo: '\\{\\{ mailcow_info.git_repo \\}\\}'#project_repo: 'Webmail'#g;
  s#branch: '\\{\\{ mailcow_info.mailcow_branch \\}\\}'#branch: ''#g" \
  data/web/templates/base.twig

cat > data/web/css/build/0082-qrzmail-branding.css <<'CSS'
.qrzmail-login-logo {
  display: grid;
  justify-items: center;
  gap: 10px;
}

.qrzmail-login-mark,
.qrzmail-navbar-mark {
  display: inline-grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 10px;
  background: #0b63ce;
  color: #fff;
  font-weight: 800;
  font-size: 24px;
}

.qrzmail-login-name {
  color: #102033;
  font-size: 24px;
  font-weight: 800;
}

.qrzmail-navbar-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.qrzmail-navbar-mark {
  width: 32px;
  height: 32px;
  font-size: 18px;
}

.qrzmail-navbar-name {
  color: #102033;
  font-weight: 800;
}

[data-bs-theme="dark"] .qrzmail-login-name,
[data-bs-theme="dark"] .qrzmail-navbar-name {
  color: #f8fbff;
}
CSS

rm -rf data/web/templates/cache/*

docker compose restart php-fpm-mailcow nginx-mailcow
