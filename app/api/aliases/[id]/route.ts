import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MailcowApiError, editMailcowAlias, deleteMailcowAlias } from "@/lib/mailcow";
import { updateData } from "@/lib/store";
import { isValidEmail } from "@/lib/validation";
import { log, logRequest, logResponse, parseJsonBody, requireCsrf } from "@/lib/middleware";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

type PatchBody = {
  goto?: string;
  active?: boolean;
};

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

  // Parse body with size limit
  const parsed = await parseJsonBody<PatchBody>(request);
  if (!parsed.ok) {
    logResponse(request, parsed.error, startTime);
    return parsed.error;
  }
  const body = parsed.data;

  const { id } = await context.params;

  // Find the alias in local data — authorize via domain ownership
  const alias = await updateData((data) => {
    const a = data.aliases.find((entry) => entry.id === id);
    if (!a) return null;
    const domain = data.domains.find((d) => d.id === a.domainId && d.ownerId === user.id);
    return domain ? a : null;
  });

  if (!alias) {
    const response = NextResponse.json({ error: "Alias not found." }, { status: 404 });
    logResponse(request, response, startTime);
    return response;
  }

  // Build the attributes to update on the mail server
  const attr: Record<string, unknown> = {};

  if (body.goto !== undefined) {
    const goto = body.goto.trim().toLowerCase();
    if (!goto) {
      const response = NextResponse.json({ error: "Destination cannot be empty." }, { status: 400 });
      logResponse(request, response, startTime);
      return response;
    }
    if (!isValidEmail(goto)) {
      const response = NextResponse.json({ error: "Invalid destination address." }, { status: 400 });
      logResponse(request, response, startTime);
      return response;
    }
    attr.goto = goto;
  }

  if (body.active !== undefined) {
    attr.active = body.active ? "1" : "0";
  }

  if (Object.keys(attr).length === 0) {
    const response = NextResponse.json({ error: "No fields to update." }, { status: 400 });
    logResponse(request, response, startTime);
    return response;
  }

  // Update on the mail server
  if (alias.mailcowId) {
    try {
      await editMailcowAlias(alias.mailcowId, attr);
    } catch (error) {
      const message =
        error instanceof MailcowApiError
          ? error.message
          : "Mail server could not update the alias. Try again in a minute.";
      const response = NextResponse.json({ error: message }, { status: 422 });
      logResponse(request, response, startTime);
      return response;
    }
  }

  // Update local data
  const result = await updateData((data) => {
    const a = data.aliases.find((entry) => entry.id === id);
    if (!a) return null;
    // Re-check domain ownership
    const domain = data.domains.find((d) => d.id === a.domainId && d.ownerId === user.id);
    if (!domain) return null;

    if (typeof attr.goto === "string") a.goto = attr.goto;
    if (body.active !== undefined) a.active = body.active;

    return a;
  });

  log("info", "Alias updated", { address: alias.address, userId: user.id });

  const response = NextResponse.json({ alias: result });
  logResponse(request, response, startTime);
  return response;
}

export async function DELETE(request: Request, context: Params) {
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

  // Find the alias in local data — authorize via domain ownership
  const alias = await updateData((data) => {
    const a = data.aliases.find((entry) => entry.id === id);
    if (!a) return null;
    const domain = data.domains.find((d) => d.id === a.domainId && d.ownerId === user.id);
    return domain ? a : null;
  });

  if (!alias) {
    const response = NextResponse.json({ error: "Alias not found." }, { status: 404 });
    logResponse(request, response, startTime);
    return response;
  }

  // Delete from the mail server
  if (alias.mailcowId) {
    try {
      await deleteMailcowAlias(alias.mailcowId);
    } catch (error) {
      if (error instanceof MailcowApiError) {
        // If the alias doesn't exist on the mail server anymore, that's fine
        // Mailcow returns an error if the alias was already removed
      } else {
        const response = NextResponse.json(
          { error: "Mail server could not delete the alias. Try again in a minute." },
          { status: 422 },
        );
        logResponse(request, response, startTime);
        return response;
      }
    }
  }

  // Remove from local data
  await updateData((data) => {
    data.aliases = data.aliases.filter((entry) => entry.id !== id);
  });

  log("info", "Alias deleted", { address: alias.address, userId: user.id });

  const response = NextResponse.json({ success: true });
  logResponse(request, response, startTime);
  return response;
}
