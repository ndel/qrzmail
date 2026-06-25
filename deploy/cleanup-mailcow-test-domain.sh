#!/usr/bin/env bash
set -euo pipefail

domain=${1:?domain required}

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
  console.log(path, response.status, text.replace(/\s+/g, " ").slice(0, 260));
}

await request("/api/v1/delete/mailbox", [`test@${domain}`]);
await request("/api/v1/delete/domain", [domain]);
NODE
