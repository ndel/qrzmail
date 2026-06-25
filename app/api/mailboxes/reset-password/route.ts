import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MailcowApiError, editMailcowMailbox } from "@/lib/mailcow";
import { updateData } from "@/lib/store";
import { isStrongPassword } from "@/lib/validation";
import { log, logRequest, logResponse, parseJsonBody, requireCsrf } from "@/lib/middleware";
import mysql from "mysql2/promise";

export const runtime = "nodejs";

// Mailcow MySQL connection (used to sync _sogo_static_view after password change)
const MAILCOW_DB_HOST = process.env.MAILCOW_DB_HOST ?? "mysql-mailcow";
const MAILCOW_DB_PORT = parseInt(process.env.MAILCOW_DB_PORT ?? "3306", 10);
const MAILCOW_DB_USER = process.env.MAILCOW_DB_USER ?? "mailcow";
const MAILCOW_DB_PASS = process.env.MAILCOW_DB_PASS ?? "";
const MAILCOW_DB_NAME = process.env.MAILCOW_DB_NAME ?? "mailcow";

type ResetBody = {
  mailboxId?: string;
  password?: string;
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
    // Non-fatal: log the error but don't break the password reset flow
    log("error", "Failed to sync _sogo_static_view", { error: String(err) });
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
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
  const parsed = await parseJsonBody<ResetBody>(request);
  if (!parsed.ok) {
    logResponse(request, parsed.error, startTime);
    return parsed.error;
  }
  const body = parsed.data;

  const mailboxId = body.mailboxId ?? "";
  const password = body.password ?? "";

  if (!isStrongPassword(password)) {
    const response = NextResponse.json(
      { error: "Password must be at least 10 characters and include a letter and number." },
      { status: 400 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  // Find the mailbox and verify ownership
  const mailbox = await updateData((data) => {
    const mb = data.mailboxes.find(
      (entry) => entry.id === mailboxId && entry.ownerId === user.id,
    );
    return mb ?? null;
  });

  if (!mailbox) {
    const response = NextResponse.json({ error: "Mailbox not found." }, { status: 404 });
    logResponse(request, response, startTime);
    return response;
  }

  // Update password on the mail server
  try {
    await editMailcowMailbox(mailbox.email, {
      password,
      password2: password,
      force_pw_update: 0,
    });
  } catch (error) {
    const message =
      error instanceof MailcowApiError
        ? error.message
        : "Mail server could not update the password. Try again in a minute.";
    const response = NextResponse.json({ error: message }, { status: 422 });
    logResponse(request, response, startTime);
    return response;
  }

  // Sync _sogo_static_view so SOGo can authenticate with the new password
  await syncSogoStaticView(mailbox.email);

  log("info", "Mailbox password reset", { email: mailbox.email, userId: user.id });

  const response = NextResponse.json({ success: true, email: mailbox.email });
  logResponse(request, response, startTime);
  return response;
}
