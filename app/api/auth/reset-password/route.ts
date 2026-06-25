import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcrypt";
import mysql from "mysql2/promise";
import { hashPassword } from "@/lib/auth";
import { updateData } from "@/lib/store";
import { log, logRequest, logResponse, parseJsonBody } from "@/lib/middleware";

export const runtime = "nodejs";

const MAILCOW_API_URL = process.env.MAILCOW_API_URL ?? "https://mail.qrzmail.com";
const MAILCOW_API_KEY = process.env.MAILCOW_API_KEY;

// Mailcow MySQL connection (used to sync _sogo_static_view after password change)
const MAILCOW_DB_HOST = process.env.MAILCOW_DB_HOST ?? "mysql-mailcow";
const MAILCOW_DB_PORT = parseInt(process.env.MAILCOW_DB_PORT ?? "3306", 10);
const MAILCOW_DB_USER = process.env.MAILCOW_DB_USER ?? "mailcow";
const MAILCOW_DB_PASS = process.env.MAILCOW_DB_PASS ?? "";
const MAILCOW_DB_NAME = process.env.MAILCOW_DB_NAME ?? "mailcow";

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

    // This mirrors the INSERT ... ON DUPLICATE KEY UPDATE logic from
    // mailcow's update_sogo_static_view() in functions.inc.php
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

  try {
    // Parse body with size limit
    const parsed = await parseJsonBody<{ email?: string; token?: string; password?: string }>(request);
    if (!parsed.ok) {
      logResponse(request, parsed.error, startTime);
      return parsed.error;
    }
    const { email, token, password } = parsed.data;

    if (!email || !token || !password) {
      const response = NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      logResponse(request, response, startTime);
      return response;
    }

    const emailStr = email.trim().toLowerCase();

    // 1. Verify Token
    const tokens = db.prepare("SELECT id, token_hash, expires_at FROM reset_tokens WHERE email = ? AND used = 0").all(emailStr) as { id: number, token_hash: string, expires_at: number }[];

    let validTokenId = null;
    const now = Math.floor(Date.now() / 1000);

    for (const row of tokens) {
      if (row.expires_at > now && bcrypt.compareSync(token, row.token_hash)) {
        validTokenId = row.id;
        break;
      }
    }

    if (!validTokenId) {
      const response = NextResponse.json({ error: "Invalid or expired password reset link." }, { status: 400 });
      logResponse(request, response, startTime);
      return response;
    }

    // 2. Call Mailcow API to update password
    if (!MAILCOW_API_KEY) {
      const response = NextResponse.json({ error: "Server misconfiguration: MAILCOW_API_KEY missing." }, { status: 500 });
      logResponse(request, response, startTime);
      return response;
    }

    const mailcowResponse = await fetch(`${MAILCOW_API_URL}/api/v1/edit/mailbox`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": MAILCOW_API_KEY,
      },
      body: JSON.stringify({
        items: [emailStr],
        attr: {
          password: password,
          password2: password,
        }
      }),
    });

    const result = await mailcowResponse.json().catch(() => null);

    if (!mailcowResponse.ok) {
      log("error", "Mailcow reset request failed", { status: mailcowResponse.status, email: emailStr });
      const response = NextResponse.json({ error: "Mail server rejected the password update." }, { status: 422 });
      logResponse(request, response, startTime);
      return response;
    }

    // 3. Sync _sogo_static_view so SOGo can authenticate with the new password
    //    (mailcow's API should do this internally, but we do it as a safety net)
    await syncSogoStaticView(emailStr);

    // 4. Update local SQLite password hash so the account login endpoint
    //    can authenticate directly without needing an IMAP round-trip
    const newHash = hashPassword(password);
    await updateData((data) => {
      const user = data.users.find((u) => u.email === emailStr);
      if (user) {
        user.passwordHash = newHash;
      }
    });

    // 5. Mark token as used
    db.prepare("UPDATE reset_tokens SET used = 1 WHERE id = ?").run(validTokenId);

    log("info", "Password reset completed", { email: emailStr });

    const response = NextResponse.json({ success: true });
    logResponse(request, response, startTime);
    return response;

  } catch (error) {
    log("error", "Reset password error", { error: String(error) });
    const response = NextResponse.json({ error: "Internal server error" }, { status: 500 });
    logResponse(request, response, startTime);
    return response;
  }
}
