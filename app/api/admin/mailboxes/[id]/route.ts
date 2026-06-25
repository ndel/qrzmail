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

  // Remove from local data
  updateData((data) => {
    data.mailboxes = data.mailboxes.filter((entry) => entry.id !== id);
  });

  log("info", "Admin deleted mailbox", { email: mailbox.email, adminId: user.id });

  const response = NextResponse.json({ success: true });
  logResponse(request, response, startTime);
  return response;
}
