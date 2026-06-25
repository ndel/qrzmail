import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MailcowApiError, deleteMailcowDomain } from "@/lib/mailcow";
import { updateData } from "@/lib/store";
import { log, logRequest, logResponse, requireCsrf } from "@/lib/middleware";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * DELETE /api/admin/domains/[id]
 *
 * Superadmin-only endpoint to delete any domain from the platform.
 * Bypasses the owner check — superadmin can delete any domain.
 */
export async function DELETE(request: Request, context: Params) {
  const startTime = Date.now();
  logRequest(request, startTime);

  const user = await getCurrentUser();
  if (!user || user.role !== "superadmin") {
    const response = NextResponse.json({ error: "Unauthorized." }, { status: 403 });
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

  // Find the domain in local data (any owner)
  const domain = await updateData((data) => {
    const d = data.domains.find((entry) => entry.id === id);
    return d ?? null;
  });

  if (!domain) {
    const response = NextResponse.json({ error: "Domain not found." }, { status: 404 });
    logResponse(request, response, startTime);
    return response;
  }

  // Check if there are mailboxes under this domain
  const mailboxCount = await updateData((data) => {
    return data.mailboxes.filter((mb) => mb.domainId === id).length;
  });

  if (mailboxCount > 0) {
    const response = NextResponse.json(
      { error: `Delete all ${mailboxCount} mailbox(es) under this domain first.` },
      { status: 400 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  // Delete from the mail server (only if it was activated)
  if (domain.status === "active" || domain.status === "verified") {
    try {
      await deleteMailcowDomain(domain.domain);
    } catch (error) {
      if (error instanceof MailcowApiError) {
        // Domain may already be gone from mail server — that's fine
      } else {
        const response = NextResponse.json(
          { error: "Mail server could not delete the domain. Try again in a minute." },
          { status: 422 },
        );
        logResponse(request, response, startTime);
        return response;
      }
    }
  }

  // Remove from local data
  await updateData((data) => {
    data.domains = data.domains.filter((entry) => entry.id !== id);
    // Also remove any aliases tied to this domain
    data.aliases = data.aliases.filter((alias) => alias.domainId !== id);
  });

  log("info", "Admin deleted domain", { domain: domain.domain, adminId: user.id });

  const response = NextResponse.json({ success: true });
  logResponse(request, response, startTime);
  return response;
}
