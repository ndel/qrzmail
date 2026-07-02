import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MailcowApiError, editMailcowMailbox, deleteMailcowMailbox } from "@/lib/mailcow";
import { updateData } from "@/lib/store";
import { isStrongPassword } from "@/lib/validation";
import { log, logRequest, logResponse, parseJsonBody, requireCsrf } from "@/lib/middleware";
import db from "@/lib/db";
import mysql from "mysql2/promise";

export const runtime = "nodejs";

/**
 * Sync the recovery email to the SQLite user_recovery table so the public
 * forgot-password flow can find it.
 */
function syncRecoveryToDb(email: string, recoveryEmail: string) {
  try {
    db.prepare(
      "INSERT OR REPLACE INTO user_recovery (email, recovery_email) VALUES (?, ?)",
    ).run(email, recoveryEmail);
  } catch (err) {
    log("error", "Failed to sync recovery email to SQLite", { error: String(err) });
  }
}

// Mailcow MySQL connection (used to sync _sogo_static_view after password change)
const MAILCOW_DB_HOST = process.env.MAILCOW_DB_HOST ?? "mysql-mailcow";
const MAILCOW_DB_PORT = parseInt(process.env.MAILCOW_DB_PORT ?? "3306", 10);
const MAILCOW_DB_USER = process.env.MAILCOW_DB_USER ?? "mailcow";
const MAILCOW_DB_PASS = process.env.MAILCOW_DB_PASS ?? "";
const MAILCOW_DB_NAME = process.env.MAILCOW_DB_NAME ?? "mailcow";

type Params = {
  params: Promise<{ id: string }>;
};

type PatchBody = {
  name?: string;
  quotaMb?: number;
  password?: string;
  recoveryEmail?: string;
};

/**
 * Sync the _sogo_static_view table for a given mailbox after a password change.
 * This ensures SOGo can authenticate the user with the new password.
 */
async function syncSogoStaticView(email: string): Promise<void> {
  if (!MAILCOW_DB_PASS) {
    log("warn", "MAILCOW_DB_PASS not set — skipping _sogo_static_view sync");
    return;
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: MAILCOW_DB_HOST,
      port: MAILCOW_DB_PORT,
      user: MAILCOW_DB_USER,
      password: MAILCOW_DB_PASS,
      database: MAILCOW_DB_NAME,
      connectTimeout: 5000,
    });

    const query = `
      INSERT INTO _sogo_static_view (c_uid, domain, c_name, c_password, c_cn, mail, aliases, ad_aliases, ext_acl, kind, multiple_bookings)
      SELECT
        mailbox.username,
        mailbox.domain,
        mailbox.username,
        mailbox.password,
        mailbox.name,
        mailbox.username,
        IFNULL(GROUP_CONCAT(ga.aliases ORDER BY ga.aliases SEPARATOR ' '), ''),
        IFNULL(gda.ad_alias, ''),
        IFNULL(external_acl.send_as_acl, ''),
        mailbox.kind,
        mailbox.multiple_bookings
      FROM mailbox
      LEFT OUTER JOIN grouped_mail_aliases ga ON ga.username REGEXP CONCAT('(^|,)', mailbox.username, '($|,)')
      LEFT OUTER JOIN grouped_domain_alias_address gda ON gda.username = mailbox.username
      LEFT OUTER JOIN grouped_sender_acl_external external_acl ON external_acl.username = mailbox.username
      WHERE mailbox.username = ?
      GROUP BY mailbox.username
      ON DUPLICATE KEY UPDATE
        domain = VALUES(domain),
        c_name = VALUES(c_name),
        c_password = VALUES(c_password),
        c_cn = VALUES(c_cn),
        mail = VALUES(mail),
        aliases = VALUES(aliases),
        ad_aliases = VALUES(ad_aliases),
        ext_acl = VALUES(ext_acl),
        kind = VALUES(kind),
        multiple_bookings = VALUES(multiple_bookings)
    `;

    await connection.execute(query, [email]);
    log("info", "Synced _sogo_static_view", { email });
  } catch (err) {
    // Non-fatal: log the error but don't break the flow
    log("error", "Failed to sync _sogo_static_view", { error: String(err) });
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

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

  // Find the mailbox in local data — authorize via domain ownership
  const mailbox = await updateData((data) => {
    const mb = data.mailboxes.find((entry) => entry.id === id);
    if (!mb) return null;
    // Check if user owns the domain this mailbox belongs to
    const domain = data.domains.find((d) => d.id === mb.domainId && d.ownerId === user.id);
    return domain ? mb : null;
  });

  if (!mailbox) {
    const response = NextResponse.json({ error: "Mailbox not found." }, { status: 404 });
    logResponse(request, response, startTime);
    return response;
  }

  // Build the attributes to update on the mail server
  const attr: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = body.name.trim().slice(0, 80);
    if (!name) {
      const response = NextResponse.json({ error: "Display name cannot be empty." }, { status: 400 });
      logResponse(request, response, startTime);
      return response;
    }
    attr.name = name;
  }

  if (body.quotaMb !== undefined) {
    const quota = Number(body.quotaMb);
    if (quota < 256 || !Number.isFinite(quota)) {
      const response = NextResponse.json({ error: "Quota must be at least 256 MB." }, { status: 400 });
      logResponse(request, response, startTime);
      return response;
    }
    attr.quota = quota;
  }

  // recoveryEmail is stored locally only, not sent to Mailcow
  let recoveryEmail: string | undefined;
  if (body.recoveryEmail !== undefined) {
    recoveryEmail = body.recoveryEmail.trim().toLowerCase();
  }

  if (body.password !== undefined) {
    if (!isStrongPassword(body.password)) {
      const response = NextResponse.json(
        { error: "Password must be at least 10 characters and include a letter and number." },
        { status: 400 },
      );
      logResponse(request, response, startTime);
      return response;
    }
    attr.password = body.password;
    attr.password2 = body.password;
    attr.force_pw_update = 0;
  }

  if (Object.keys(attr).length === 0) {
    const response = NextResponse.json({ error: "No fields to update." }, { status: 400 });
    logResponse(request, response, startTime);
    return response;
  }

  // Update on the mail server first
  try {
    await editMailcowMailbox(mailbox.email, attr);
  } catch (error) {
    const message =
      error instanceof MailcowApiError
        ? error.message
        : "Mail server could not update the mailbox. Try again in a minute.";
    const response = NextResponse.json({ error: message }, { status: 422 });
    logResponse(request, response, startTime);
    return response;
  }

  // If password was changed, sync _sogo_static_view so SOGo can authenticate
  if (body.password !== undefined) {
    await syncSogoStaticView(mailbox.email);
  }

  // Update local data
  const result = await updateData((data) => {
    const mb = data.mailboxes.find((entry) => entry.id === id);
    if (!mb) return null;
    // Re-check domain ownership
    const domain = data.domains.find((d) => d.id === mb.domainId && d.ownerId === user.id);
    if (!domain) return null;

    if (typeof attr.name === "string") mb.name = attr.name;
    if (typeof attr.quota === "number") mb.quotaMb = attr.quota;
    if (recoveryEmail !== undefined) {
      mb.recoveryEmail = recoveryEmail || undefined;
    }

    return mb;
  });

  // Sync recovery email to SQLite so the public forgot-password flow can find it
  if (recoveryEmail) {
    syncRecoveryToDb(mailbox.email, recoveryEmail);
  }

  log("info", "Mailbox updated", { email: mailbox.email, userId: user.id });

  const response = NextResponse.json({ mailbox: result });
  logResponse(request, response, startTime);
  return response;
}

export async function DELETE(request: Request, context: Params) {
  const startTime = Date.now();
  logRequest(request, startTime);

  const user = await getCurrentUser();
  if (!user) {
    log("warn", "DELETE mailbox — no user session", { path: new URL(request.url).pathname });
    const response = NextResponse.json({ error: "Login required." }, { status: 401 });
    logResponse(request, response, startTime);
    return response;
  }

  log("info", "DELETE mailbox — user authenticated", { userId: user.id, email: user.email });

  // CSRF check
  const csrfError = requireCsrf(request);
  if (csrfError) {
    log("warn", "DELETE mailbox — CSRF validation failed", {
      userId: user.id,
      cookieHeader: request.headers.get("cookie")?.substring(0, 200),
      csrfHeader: request.headers.get("x-csrf-token")?.substring(0, 20),
    });
    logResponse(request, csrfError, startTime);
    return csrfError;
  }

  const { id } = await context.params;
  log("info", "DELETE mailbox — params resolved", { id });

  // Find the mailbox in local data — authorize via domain ownership
  const mailbox = await updateData((data) => {
    const mb = data.mailboxes.find((entry) => entry.id === id);
    if (!mb) {
      log("warn", "DELETE mailbox — mailbox not found in local data", { id });
      return null;
    }
    const domain = data.domains.find((d) => d.id === mb.domainId && d.ownerId === user.id);
    if (!domain) {
      log("warn", "DELETE mailbox — domain not found or not owned by user", {
        mailboxId: id,
        email: mb.email,
        domainId: mb.domainId,
        userId: user.id,
      });
    }
    return domain ? mb : null;
  });

  if (!mailbox) {
    const response = NextResponse.json({ error: "Mailbox not found." }, { status: 404 });
    logResponse(request, response, startTime);
    return response;
  }

  log("info", "DELETE mailbox — found, proceeding to delete from mail server", {
    email: mailbox.email,
    mailboxId: mailbox.id,
    domainId: mailbox.domainId,
  });

  // Delete from the mail server first
  try {
    await deleteMailcowMailbox(mailbox.email);
    log("info", "DELETE mailbox — mail server deletion succeeded", { email: mailbox.email });
  } catch (error) {
    // If the mailbox doesn't exist on the mail server (access_denied),
    // still remove it from local data so the user can clean up stale records
    const isMailcowError = error instanceof MailcowApiError;
    const isNotFound = isMailcowError && /access_denied/i.test(error.message);

    if (!isNotFound) {
      log("error", "DELETE mailbox — mail server deletion failed", {
        email: mailbox.email,
        error: error instanceof Error ? error.message : String(error),
        isMailcowError,
      });
      const message = isMailcowError
        ? error.message
        : "Mail server could not delete the mailbox. Try again in a minute.";
      const response = NextResponse.json({ error: message }, { status: 422 });
      logResponse(request, response, startTime);
      return response;
    }
    log("warn", "DELETE mailbox — mail server returned access_denied, proceeding with local deletion", {
      email: mailbox.email,
    });
  }

  // Remove from local data
  await updateData((data) => {
    data.mailboxes = data.mailboxes.filter((entry) => entry.id !== id);
  });

  log("info", "Mailbox deleted", { email: mailbox.email, userId: user.id });

  const response = NextResponse.json({ success: true });
  logResponse(request, response, startTime);
  return response;
}
