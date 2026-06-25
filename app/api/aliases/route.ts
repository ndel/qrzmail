import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MailcowApiError, addMailcowAlias } from "@/lib/mailcow";
import { updateData, makeId, nowIso } from "@/lib/store";
import { isValidEmail } from "@/lib/validation";
import { log, logRequest, logResponse, parseJsonBody, requireCsrf } from "@/lib/middleware";

export const runtime = "nodejs";

type AliasBody = {
  domainId?: string;
  address?: string;
  goto?: string;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const aliases = await updateData((data) => {
    // Show aliases under domains the user owns
    const userDomainIds = new Set(
      data.domains
        .filter((d) => d.ownerId === user.id)
        .map((d) => d.id),
    );
    return data.aliases.filter(
      (a) => userDomainIds.has(a.domainId),
    );
  });

  return NextResponse.json({ aliases });
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
  const parsed = await parseJsonBody<AliasBody>(request);
  if (!parsed.ok) {
    logResponse(request, parsed.error, startTime);
    return parsed.error;
  }
  const body = parsed.data;

  const domainId = body.domainId ?? "";
  const address = (body.address ?? "").trim().toLowerCase();
  const goto = (body.goto ?? "").trim().toLowerCase();

  if (!address || !goto) {
    const response = NextResponse.json({ error: "Address and destination are required." }, { status: 400 });
    logResponse(request, response, startTime);
    return response;
  }

  if (!isValidEmail(address)) {
    const response = NextResponse.json({ error: "Invalid alias address." }, { status: 400 });
    logResponse(request, response, startTime);
    return response;
  }

  if (!isValidEmail(goto)) {
    const response = NextResponse.json({ error: "Invalid destination address." }, { status: 400 });
    logResponse(request, response, startTime);
    return response;
  }

  // Verify the domain belongs to the user and is active
  const domain = await updateData((data) => {
    const d = data.domains.find(
      (entry) => entry.id === domainId && entry.ownerId === user.id,
    );
    return d ?? null;
  });

  if (!domain) {
    const response = NextResponse.json({ error: "Domain not found." }, { status: 404 });
    logResponse(request, response, startTime);
    return response;
  }

  if (domain.status !== "active") {
    const response = NextResponse.json({ error: "Domain must be active before creating aliases." }, { status: 400 });
    logResponse(request, response, startTime);
    return response;
  }

  // Verify the alias address belongs to the user's domain
  const atIndex = address.indexOf("@");
  const addressDomain = address.slice(atIndex + 1);
  if (addressDomain !== domain.domain) {
    const response = NextResponse.json(
      { error: `Alias address must be under your domain ${domain.domain}.` },
      { status: 400 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  // Create on the mail server
  let mailcowResult: unknown;
  try {
    mailcowResult = await addMailcowAlias({ address, goto, active: true });
  } catch (error) {
    const rawMessage =
      error instanceof MailcowApiError
        ? error.message
        : "Mail server could not create the alias. Try again in a minute.";

    // Translate common Mailcow errors into user-friendly messages
    let friendlyMessage = rawMessage;
    if (/is_alias_or_mailbox/i.test(rawMessage)) {
      friendlyMessage = `The address "${address}" is already registered as a mailbox or alias. Please choose a different address.`;
    } else if (/already exists/i.test(rawMessage)) {
      friendlyMessage = `The alias "${address}" already exists.`;
    }

    log("error", "Mailcow alias creation failed", { address, error: rawMessage });
    const response = NextResponse.json({ error: friendlyMessage }, { status: 422 });
    logResponse(request, response, startTime);
    return response;
  }

  // Extract the mailcow alias ID from the response
  // The response is an array of objects like: [{ type: "success", msg: ["alias_added", "alias@domain.tld"] }]
  let mailcowId = "";
  if (Array.isArray(mailcowResult)) {
    for (const entry of mailcowResult) {
      if (entry?.type === "success" && Array.isArray(entry.msg)) {
        // msg is like ["alias_added", "alias@domain.tld"]
        // We don't get the numeric ID back, so we'll use the address as reference
        mailcowId = address;
      }
    }
  }

  // Save to local data
  const record = await updateData((data) => {
    const alias = {
      id: makeId(),
      ownerId: user.id,
      domainId,
      mailcowId,
      address,
      goto,
      active: true,
      createdAt: nowIso(),
    };
    data.aliases.push(alias);
    return alias;
  });

  const response = NextResponse.json({ alias: record }, { status: 201 });
  logResponse(request, response, startTime);
  return response;
}
