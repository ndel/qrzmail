import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MailcowApiError, addMailcowMailbox, isAlreadyExistsError } from "@/lib/mailcow";
import { makeId, nowIso, readData, updateData } from "@/lib/store";
import { isStrongPassword, isValidLocalPart } from "@/lib/validation";
import { log, logRequest, logResponse, parseJsonBody, requireCsrf } from "@/lib/middleware";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const SMTP_HOST = process.env.SMTP_HOST || "postfix-mailcow";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "25", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || '"QRZMail Support" <noreply@qrzmail.com>';
const MAIL_SERVER_HOST = process.env.IMAP_SERVERNAME || process.env.IMAP_HOST || "mail.qrzmail.com";
const WEBMAIL_URL = process.env.WEBMAIL_URL || "https://mail.qrzmail.com/SOGo/";

/**
 * Sync the recovery email to the SQLite user_recovery table so the public
 * forgot-password flow can find it.
 */
function syncRecoveryToDb(email: string, recoveryEmail: string) {
  try {
    // Dynamic import to avoid circular dependencies at module level
    const db = require("@/lib/db").default;
    db.prepare(
      "INSERT OR REPLACE INTO user_recovery (email, recovery_email) VALUES (?, ?)",
    ).run(email, recoveryEmail);
  } catch (err) {
    log("error", "Failed to sync recovery email to SQLite", { email, error: String(err) });
  }
}

/**
 * Send a welcome email to the new mailbox with connection details.
 */
async function sendWelcomeEmail(email: string, password: string, name: string, recoveryEmail?: string) {
  const smtpOptions: Record<string, unknown> = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    ignoreTLS: SMTP_PORT !== 465 && !SMTP_USER,
  };
  if (SMTP_USER && SMTP_PASS) {
    smtpOptions.auth = { user: SMTP_USER, pass: SMTP_PASS };
  }

  const localPart = email.split("@")[0];

  const text = [
    `Welcome to QRZMail, ${name}!`,
    ``,
    `Your mailbox ${email} has been created and is ready to use.`,
    ``,
    `── IMAP (Incoming Mail) ──`,
    `Server: ${MAIL_SERVER_HOST}`,
    `Port: 993`,
    `Security: SSL/TLS`,
    `Username: ${email}`,
    `Password: (the password you set)`,
    ``,
    `── SMTP (Outgoing Mail) ──`,
    `Server: ${MAIL_SERVER_HOST}`,
    `Port: 587`,
    `Security: STARTTLS`,
    `Username: ${email}`,
    `Password: (the password you set)`,
    ``,
    `Best regards,`,
    `The QRZMail Team`,
  ].join("\n");

  try {
    const transporter = nodemailer.createTransport(smtpOptions);
    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: `Welcome to QRZMail — ${email} is ready!`,
      text,
    });
    log("info", "Welcome email sent", { email });
  } catch (err) {
    log("error", "Failed to send welcome email", { email, error: String(err) });
  }
}

type MailboxBody = {
  domainId?: string;
  localPart?: string;
  name?: string;
  password?: string;
  quotaMb?: number;
  recoveryEmail?: string;
};

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
  const parsed = await parseJsonBody<MailboxBody>(request);
  if (!parsed.ok) {
    logResponse(request, parsed.error, startTime);
    return parsed.error;
  }
  const body = parsed.data;

  const domainId = body.domainId ?? "";
  const localPart = (body.localPart ?? "").trim().toLowerCase();
  const name = (body.name ?? localPart).trim().slice(0, 80);
  const password = body.password ?? "";
  const quotaMb = Number(body.quotaMb ?? 3072);

  if (!isValidLocalPart(localPart)) {
    const response = NextResponse.json(
      { error: "Use 3-32 lowercase letters, numbers, dots, dashes, or underscores." },
      { status: 400 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  if (!isStrongPassword(password)) {
    const response = NextResponse.json(
      { error: "Password must be at least 10 characters and include a letter and number." },
      { status: 400 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  const data = await readData();
  const domain = data.domains.find(
    (entry) => entry.id === domainId && entry.ownerId === user.id && entry.status === "active",
  );
  if (!domain) {
    const response = NextResponse.json(
      { error: "Verify DNS first. Mailbox creation is enabled after the domain is active." },
      { status: 400 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  const email = `${localPart}@${domain.domain}`;
  if (data.mailboxes.some((mailbox) => mailbox.email === email)) {
    const response = NextResponse.json({ error: "That mailbox already exists." }, { status: 409 });
    logResponse(request, response, startTime);
    return response;
  }

  try {
    await addMailcowMailbox({
      domain: domain.domain,
      localPart,
      name,
      password,
      quotaMb,
    });
  } catch (error) {
    log("error", "Mailcow mailbox creation failed", {
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    let message: string;
    if (isAlreadyExistsError(error)) {
      message = `The mailbox ${email} already exists on the mail server.`;
    } else if (error instanceof MailcowApiError) {
      message = error.message;
    } else {
      message = "Mail server could not create that mailbox. Try again in a minute.";
    }
    const response = NextResponse.json({ error: message }, { status: 422 });
    logResponse(request, response, startTime);
    return response;
  }

  const recoveryEmail = (body.recoveryEmail ?? "").trim().toLowerCase();

  const result = await updateData((data) => {
    if (data.mailboxes.some((mailbox) => mailbox.email === email)) {
      return { error: "That mailbox already exists.", status: 409 as const };
    }

    const mailbox = {
      id: makeId(),
      ownerId: user.id,
      domainId: domain.id,
      email,
      name,
      quotaMb,
      recoveryEmail: recoveryEmail || undefined,
      createdAt: nowIso(),
    };
    data.mailboxes.push(mailbox);
    return { mailbox };
  });

  if ("error" in result) {
    const response = NextResponse.json({ error: result.error }, { status: result.status });
    logResponse(request, response, startTime);
    return response;
  }

  // Sync recovery email to SQLite so the public forgot-password flow can find it
  if (recoveryEmail) {
    syncRecoveryToDb(email, recoveryEmail);
  }

  // Send welcome email with connection details (fire-and-forget, don't block)
  sendWelcomeEmail(email, password, name, recoveryEmail);

  const response = NextResponse.json({ mailbox: result.mailbox });
  logResponse(request, response, startTime);
  return response;
}
