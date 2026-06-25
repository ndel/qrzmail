import { NextResponse } from "next/server";
import { generateKeyPairSync } from "node:crypto";
import { execSync } from "node:child_process";
import { promises as dns } from "node:dns";
import { getCurrentUser } from "@/lib/auth";
import { updateData } from "@/lib/store";
import { log, logRequest, logResponse, requireCsrf } from "@/lib/middleware";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

const REDIS_HOST = process.env.REDIS_HOST ?? "redis-mailcow";
const REDIS_PASSWORD = process.env.REDIS_PASSWORD ?? "BmEZfDNusDZ4LsT0BEXqMf7AuiRz";
const DKIM_SELECTOR = "dkim";

function formatDkimPublicKey(pem: string): string {
  // Strip PEM headers/footers and newlines, return raw base64
  return pem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s+/g, "");
}

function makeDkimDnsRecord(domain: string, publicKeyPem: string): string {
  const pub = formatDkimPublicKey(publicKeyPem);
  return `v=DKIM1; h=sha256; k=rsa; p=${pub}`;
}

function redisSet(hash: string, key: string, value: string) {
  // Use redis-cli to set a hash field
  // Escape single quotes in the value for shell safety
  const escaped = value.replace(/'/g, "'\\''");
  execSync(
    `redis-cli -h ${REDIS_HOST} -a '${REDIS_PASSWORD}' HMSET '${hash}' '${key}' '${escaped}'`,
    { timeout: 10000, stdio: "pipe" },
  );
}

async function checkDkimDnsRecord(domain: string): Promise<boolean> {
  try {
    const hostname = `${DKIM_SELECTOR}._domainkey.${domain}`;
    const records = await dns.resolveTxt(hostname);
    // Check if any TXT record contains "v=DKIM1"
    return records.some((record) =>
      record.some((chunk) => chunk.includes("v=DKIM1")),
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request, context: Params) {
  const startTime = Date.now();
  logRequest(request, startTime);

  const user = await getCurrentUser();
  if (!user) {
    const response = NextResponse.json({ error: "Login required." }, { status: 401 });
    logResponse(request, response, startTime);
    return response;
  }

  // CSRF check
  const csrfError = requireCsrf(request);
  if (csrfError) {
    logResponse(request, csrfError, startTime);
    return csrfError;
  }

  const { id } = await context.params;

  // Find the domain and verify ownership
  const domain = await updateData((data) => {
    const d = data.domains.find(
      (entry) => entry.id === id && entry.ownerId === user.id,
    );
    return d ?? null;
  });

  if (!domain) {
    const response = NextResponse.json({ error: "Domain not found." }, { status: 404 });
    logResponse(request, response, startTime);
    return response;
  }

  if (domain.status !== "active" && domain.status !== "verified") {
    const response = NextResponse.json(
      { error: "Domain must be verified before generating DKIM keys." },
      { status: 400 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  // Generate RSA 2048-bit key pair
  let publicKeyPem: string;
  let privateKeyPem: string;

  try {
    const keyPair = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    publicKeyPem = keyPair.publicKey;
    privateKeyPem = keyPair.privateKey;
  } catch (error) {
    const response = NextResponse.json(
      { error: "Failed to generate DKIM key pair." },
      { status: 500 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  // Store keys in Mailcow Redis
  try {
    redisSet("DKIM_PRIV_KEYS", domain.domain, privateKeyPem);
    redisSet("DKIM_PUB_KEYS", domain.domain, publicKeyPem);
  } catch (error) {
    log("error", "Failed to store DKIM keys in Redis", { error: String(error) });
    // Continue anyway — we save to local store so user can retry
  }

  // Save DKIM info to local store
  const dkimRecord = await updateData((data) => {
    const d = data.domains.find(
      (entry) => entry.id === id && entry.ownerId === user.id,
    );
    if (!d) return null;

    d.dkim = {
      selector: DKIM_SELECTOR,
      publicKey: publicKeyPem,
      privateKey: privateKeyPem,
      status: "pending_dns",
    };
    return d.dkim;
  });

  if (!dkimRecord) {
    const response = NextResponse.json({ error: "Failed to save DKIM record." }, { status: 500 });
    logResponse(request, response, startTime);
    return response;
  }

  // Build DNS records the user needs to add
  const dkimDnsValue = makeDkimDnsRecord(domain.domain, publicKeyPem);

  const dnsRecords = {
    dkim: {
      type: "TXT",
      host: `${DKIM_SELECTOR}._domainkey.${domain.domain}`,
      value: dkimDnsValue,
    },
    spf: {
      type: "TXT",
      host: "@",
      value: "v=spf1 mx ip4:155.133.22.250 ~all",
    },
    dmarc: {
      type: "TXT",
      host: `_dmarc.${domain.domain}`,
      value: "v=DMARC1; p=none",
    },
  };

  log("info", "DKIM keys generated", { domain: domain.domain, userId: user.id });

  const response = NextResponse.json({
    success: true,
    selector: DKIM_SELECTOR,
    dnsRecords,
    status: "pending_dns",
  });
  logResponse(request, response, startTime);
  return response;
}

/**
 * PATCH /api/domains/[id]/dkim
 * Verifies that the DKIM DNS record is published and updates status to "active".
 */
export async function PATCH(request: Request, context: Params) {
  const startTime = Date.now();
  logRequest(request, startTime);

  const user = await getCurrentUser();
  if (!user) {
    const response = NextResponse.json({ error: "Login required." }, { status: 401 });
    logResponse(request, response, startTime);
    return response;
  }

  // CSRF check
  const csrfError = requireCsrf(request);
  if (csrfError) {
    logResponse(request, csrfError, startTime);
    return csrfError;
  }

  const { id } = await context.params;

  // Find the domain and verify ownership
  const domain = await updateData((data) => {
    const d = data.domains.find(
      (entry) => entry.id === id && entry.ownerId === user.id,
    );
    return d ?? null;
  });

  if (!domain) {
    const response = NextResponse.json({ error: "Domain not found." }, { status: 404 });
    logResponse(request, response, startTime);
    return response;
  }

  if (!domain.dkim) {
    const response = NextResponse.json(
      { error: "No DKIM keys generated yet. Generate DKIM keys first." },
      { status: 400 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  if (domain.dkim.status === "active") {
    const response = NextResponse.json({
      success: true,
      status: "active",
      message: "DKIM is already active.",
    });
    logResponse(request, response, startTime);
    return response;
  }

  // Check DNS for the DKIM record
  const found = await checkDkimDnsRecord(domain.domain);

  if (!found) {
    const response = NextResponse.json(
      {
        error:
          "DKIM DNS record not found. Make sure you've added the TXT record and DNS has propagated. It can take up to 24 hours.",
        status: "pending_dns",
      },
      { status: 400 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  // Update status to active
  await updateData((data) => {
    const d = data.domains.find(
      (entry) => entry.id === id && entry.ownerId === user.id,
    );
    if (d?.dkim) {
      d.dkim.status = "active";
    }
  });

  log("info", "DKIM verified", { domain: domain.domain, userId: user.id });

  const response = NextResponse.json({
    success: true,
    status: "active",
    message: "DKIM DNS record verified. Email authentication is now active.",
  });
  logResponse(request, response, startTime);
  return response;
}
