import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MailcowApiError, deleteMailcowMailbox } from "@/lib/mailcow";
import { updateData } from "@/lib/store";
import { log, logRequest, logResponse, requireCsrf } from "@/lib/middleware";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * DELETE /api/admin/mailboxes/[id]
 *
 * Superadmin-only endpoint to delete any mailbox from the platform.
 * Bypasses the owner check — superadmin can delete any mailbox.
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

  // Find the mailbox in local data (any owner)
  const mailbox = await updateData((data) => {
    const mb = data.mailboxes.find((entry) => entry.id === id);
    return mb ?? null;
  });

  if (!mailbox) {
    const response = NextResponse.json({ error: "Mailbox not found." }, { status: 404 });
    logResponse(request, response, startTime);
    return response;
  }

  // Delete from the mail server first
  try {
    await deleteMailcowMailbox(mailbox.email);
  } catch (error) {
    // If the mailbox doesn't exist on the mail server (access_denied),
    // still remove it from local data so the admin can clean up stale records
    const isMailcowError = error instanceof MailcowApiError;
    const isNotFound = isMailcowError && /access_denied/i.test(error.message);

    if (!isNotFound) {
      log("error", "Admin mailbox delete failed on mail server", {
        email: mailbox.email,
        error: error instanceof Error ? error.message : String(error),
      });
      const message =
        error instanceof MailcowApiError
          ? error.message
          : "Mail server could not delete the mailbox. Try again in a minute.";
      const response = NextResponse.json({ error: message }, { status: 422 });
      logResponse(request, response, startTime);
      return response;
    }
  }

  // Remove from local data. If this was a standalone QRZMail account,
  // remove the matching domain-panel user once it has no owned resources.
  const cleanup = updateData((data) => {
    let deletedUserEmail: string | null = null;
    const mailboxOwner = data.users.find(
      (entry) =>
        entry.id === mailbox.ownerId &&
        entry.role !== "superadmin" &&
        entry.email.toLowerCase() === mailbox.email.toLowerCase(),
    );

    data.mailboxes = data.mailboxes.filter((entry) => entry.id !== id);

    if (mailboxOwner) {
      const hasOtherMailboxes = data.mailboxes.some((entry) => entry.ownerId === mailboxOwner.id);
      const hasDomains = data.domains.some((entry) => entry.ownerId === mailboxOwner.id);
      const hasAliases = data.aliases.some((entry) => entry.ownerId === mailboxOwner.id);

      if (!hasOtherMailboxes && !hasDomains && !hasAliases) {
        data.users = data.users.filter((entry) => entry.id !== mailboxOwner.id);
        deletedUserEmail = mailboxOwner.email;
      }
    }

    return { deletedUserEmail };
  });

  log("info", "Admin deleted mailbox", {
    email: mailbox.email,
    adminId: user.id,
    deletedUserEmail: cleanup.deletedUserEmail,
  });

  const response = NextResponse.json({ success: true, deletedUserEmail: cleanup.deletedUserEmail });
  logResponse(request, response, startTime);
  return response;
}
