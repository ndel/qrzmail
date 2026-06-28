import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MailcowApiError, deleteMailcowDomain, deleteMailcowMailbox } from "@/lib/mailcow";
import { updateData } from "@/lib/store";
import { log, logRequest, logResponse, requireCsrf } from "@/lib/middleware";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

function isMissingOnMailServer(error: unknown) {
  return error instanceof MailcowApiError && /access_denied|not found|does not exist/i.test(error.message);
}

/**
 * DELETE /api/admin/users/[id]
 *
 * Superadmin-only endpoint to delete a user and all local resources they own.
 * Mailboxes and active/verified domains are removed from Mailcow first.
 */
export async function DELETE(request: Request, context: Params) {
  const startTime = Date.now();
  logRequest(request, startTime);

  const admin = await getCurrentUser();
  if (!admin || admin.role !== "superadmin") {
    const response = NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    logResponse(request, response, startTime);
    return response;
  }

  const csrfError = requireCsrf(request);
  if (csrfError) {
    logResponse(request, csrfError, startTime);
    return csrfError;
  }

  const { id } = await context.params;
  if (id === admin.id) {
    const response = NextResponse.json({ error: "You cannot delete your own superadmin account." }, { status: 400 });
    logResponse(request, response, startTime);
    return response;
  }

  const snapshot = await updateData((data) => {
    const target = data.users.find((entry) => entry.id === id);
    if (!target) return null;
    return {
      user: target,
      mailboxes: data.mailboxes.filter((mailbox) => mailbox.ownerId === id),
      domains: data.domains.filter((domain) => domain.ownerId === id),
    };
  });

  if (!snapshot) {
    const response = NextResponse.json({ error: "User not found." }, { status: 404 });
    logResponse(request, response, startTime);
    return response;
  }

  if (snapshot.user.role === "superadmin") {
    const response = NextResponse.json({ error: "Superadmin users cannot be deleted here." }, { status: 400 });
    logResponse(request, response, startTime);
    return response;
  }

  for (const mailbox of snapshot.mailboxes) {
    try {
      await deleteMailcowMailbox(mailbox.email);
    } catch (error) {
      if (!isMissingOnMailServer(error)) {
        log("error", "Admin user delete failed deleting mailbox on mail server", {
          email: mailbox.email,
          error: error instanceof Error ? error.message : String(error),
        });
        const message =
          error instanceof MailcowApiError
            ? error.message
            : "Mail server could not delete one of the user's mailboxes.";
        const response = NextResponse.json({ error: message }, { status: 422 });
        logResponse(request, response, startTime);
        return response;
      }
    }
  }

  for (const domain of snapshot.domains) {
    if (domain.status !== "active" && domain.status !== "verified") continue;
    try {
      await deleteMailcowDomain(domain.domain);
    } catch (error) {
      if (!isMissingOnMailServer(error)) {
        log("error", "Admin user delete failed deleting domain on mail server", {
          domain: domain.domain,
          error: error instanceof Error ? error.message : String(error),
        });
        const message =
          error instanceof MailcowApiError
            ? error.message
            : "Mail server could not delete one of the user's domains.";
        const response = NextResponse.json({ error: message }, { status: 422 });
        logResponse(request, response, startTime);
        return response;
      }
    }
  }

  await updateData((data) => {
    const domainIds = new Set(snapshot.domains.map((domain) => domain.id));
    const mailboxIds = new Set(snapshot.mailboxes.map((mailbox) => mailbox.id));

    data.aliases = data.aliases.filter(
      (alias) => alias.ownerId !== id && !domainIds.has(alias.domainId),
    );
    data.mailboxes = data.mailboxes.filter(
      (mailbox) => mailbox.ownerId !== id && !mailboxIds.has(mailbox.id),
    );
    data.domains = data.domains.filter((domain) => domain.ownerId !== id);
    data.users = data.users.filter((entry) => entry.id !== id);
  });

  log("info", "Admin deleted user", {
    email: snapshot.user.email,
    adminId: admin.id,
    mailboxCount: snapshot.mailboxes.length,
    domainCount: snapshot.domains.length,
  });

  const response = NextResponse.json({ success: true });
  logResponse(request, response, startTime);
  return response;
}
