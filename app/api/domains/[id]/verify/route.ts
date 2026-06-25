import { NextResponse } from "next/server";
import { resolveTxt } from "node:dns/promises";
import { getCurrentUser } from "@/lib/auth";
import { MailcowApiError, addMailcowDomain, isAlreadyExistsError } from "@/lib/mailcow";
import { nowIso, updateData } from "@/lib/store";
import { log, logRequest, logResponse, requireCsrf } from "@/lib/middleware";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

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
  let mailcowDomain: string | null = null;

  // Step 1: Find the domain (synchronous read)
  const domain = await updateData((data) => {
    const entry = data.domains.find((d) => d.id === id && d.ownerId === user.id);
    if (!entry) {
      return null;
    }
    return { ...entry };
  });

  if (!domain) {
    const response = NextResponse.json({ error: "Domain not found." }, { status: 404 });
    logResponse(request, response, startTime);
    return response;
  }

  // Step 2: DNS lookup (async, outside updateData)
  const txtValues = await resolveTxt(`_qrzmail.${domain.domain}`).catch(() => []);
  const records = txtValues.map((parts) => parts.join(""));
  if (!records.includes(domain.verificationToken)) {
    const response = NextResponse.json(
      {
        error: `Add TXT _qrzmail.${domain.domain} with value ${domain.verificationToken}.`,
      },
      { status: 400 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  // Step 3: Update domain status (synchronous updateData)
  if (domain.status !== "active") {
    mailcowDomain = domain.domain;
    await updateData((data) => {
      const entry = data.domains.find((d) => d.id === id && d.ownerId === user.id);
      if (entry) {
        entry.status = "verified";
        entry.verifiedAt = nowIso();
      }
    });
  }

  // Step 4: Activate on Mailcow
  if (mailcowDomain) {
    try {
      await addMailcowDomain(mailcowDomain);
    } catch (error) {
      if (!isAlreadyExistsError(error)) {
        const message =
          error instanceof MailcowApiError
            ? error.message
            : "DNS verified, but mail server activation failed. Try again in a minute.";
        const response = NextResponse.json({ error: message }, { status: 422 });
        logResponse(request, response, startTime);
        return response;
      }
    }

    await updateData((data) => {
      const entry = data.domains.find((d) => d.id === id && d.ownerId === user.id);
      if (entry) {
        entry.status = "active";
      }
    });
  }

  log("info", "Domain verified", { domain: domain.domain, userId: user.id });

  const response = NextResponse.json({ domain });
  logResponse(request, response, startTime);
  return response;
}
