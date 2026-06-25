import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { makeId, nowIso, readData, updateData } from "@/lib/store";
import { isValidDomain, normalizeDomain } from "@/lib/validation";
import { log, logRequest, logResponse, parseJsonBody, requireCsrf } from "@/lib/middleware";

export const runtime = "nodejs";

const SYSTEM_DOMAIN = process.env.MAIL_DOMAIN ?? "qrzmail.com";

type DomainBody = {
  domain?: string;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const data = await readData();
  const domains = data.domains.filter(
    (domain) => domain.ownerId === user.id,
  );
  const domainIds = new Set(domains.map((d) => d.id));
  // Show all mailboxes/aliases under domains the user owns,
  // regardless of who created them
  const mailboxes = data.mailboxes.filter(
    (mailbox) => domainIds.has(mailbox.domainId),
  );
  const aliases = data.aliases.filter(
    (alias) => domainIds.has(alias.domainId),
  );

  return NextResponse.json({ domains, mailboxes, aliases });
}

export async function POST(request: Request) {
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

  // Parse body with size limit
  const parsed = await parseJsonBody<DomainBody>(request);
  if (!parsed.ok) {
    logResponse(request, parsed.error, startTime);
    return parsed.error;
  }
  const body = parsed.data;

  const domain = normalizeDomain(body.domain ?? "");

  if (!isValidDomain(domain)) {
    const response = NextResponse.json({ error: "Enter a valid domain name." }, { status: 400 });
    logResponse(request, response, startTime);
    return response;
  }

  const record = await updateData((data) => {
    if (data.domains.some((existing) => existing.domain === domain)) {
      return null;
    }

    const created = {
      id: makeId(),
      ownerId: user.id,
      domain,
      status: "pending_dns" as const,
      verificationToken: `qrzmail-verify=${crypto.randomBytes(18).toString("base64url")}`,
      createdAt: nowIso(),
    };
    data.domains.push(created);
    return created;
  });

  if (!record) {
    const response = NextResponse.json({ error: "That domain is already registered." }, { status: 409 });
    logResponse(request, response, startTime);
    return response;
  }

  const response = NextResponse.json({ domain: record });
  logResponse(request, response, startTime);
  return response;
}
