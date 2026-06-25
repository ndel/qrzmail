#!/usr/bin/env bash
set -euo pipefail

domain="api-test-$(date +%s).example.com"

docker exec -i -e TEST_DOMAIN="$domain" qrzmail-web node <<'NODE'
const domain = process.env.TEST_DOMAIN;
const key = process.env.MAILCOW_API_KEY;

async function request(path, body) {
  const response = await fetch(`https://nginx-mailcow${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": key,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  console.log(path, response.status, text.replace(/\s+/g, " ").slice(0, 320));
  if (!response.ok) {
    process.exitCode = 1;
  }
}

await request("/api/v1/add/domain", {
  active: 1,
  aliases: 5,
  backupmx: 0,
  defquota: 1024,
  description: "QRZMail API test",
  domain,
  mailboxes: 5,
  maxquota: 2048,
  quota: 10240,
  relay_all_recipients: 0,
  rl_frame: "s",
  rl_value: 10,
});

await request("/api/v1/add/mailbox", {
  active: 1,
  authsource: "mailcow",
  domain,
  force_pw_update: 0,
  local_part: "test",
  name: "Test",
  password: "ApiTest2026x",
  password2: "ApiTest2026x",
  quota: 1024,
  tls_enforce_in: 0,
  tls_enforce_out: 0,
});

await request("/api/v1/delete/mailbox", [`test@${domain}`]);
await request("/api/v1/delete/domain", [domain]);
NODE
