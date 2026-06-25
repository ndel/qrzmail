import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";
import { log, logRequest, logResponse, parseJsonBody, requireCsrf } from "@/lib/middleware";
import crypto from "node:crypto";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const SMTP_HOST = process.env.SMTP_HOST || "postfix-mailcow";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "25", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || '"QRZMail Support" <noreply@qrzmail.com>';
const BASE_URL = process.env.BASE_URL || "https://qrzmail.com";

type SendResetBody = {
  mailboxId?: string;
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
  const parsed = await parseJsonBody<SendResetBody>(request);
  if (!parsed.ok) {
    logResponse(request, parsed.error, startTime);
    return parsed.error;
  }
  const body = parsed.data;

  const mailboxId = body.mailboxId ?? "";

  if (!mailboxId) {
    const response = NextResponse.json({ error: "mailboxId is required." }, { status: 400 });
    logResponse(request, response, startTime);
    return response;
  }

  const data = await readData();
  const mailbox = data.mailboxes.find((m) => m.id === mailboxId && m.ownerId === user.id);
  if (!mailbox) {
    const response = NextResponse.json({ error: "Mailbox not found." }, { status: 404 });
    logResponse(request, response, startTime);
    return response;
  }

  const recoveryEmail = mailbox.recoveryEmail;
  if (!recoveryEmail) {
    const response = NextResponse.json({ error: "No recovery email set for this mailbox." }, { status: 400 });
    logResponse(request, response, startTime);
    return response;
  }

  // Generate a reset token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  // Store the token in SQLite via the existing reset_tokens table
  const { default: db } = await import("@/lib/db");
  const bcrypt = await import("bcrypt");
  const hashedToken = bcrypt.hashSync(rawToken, 10);

  // Ensure a user_recovery row exists
  db.prepare(
    "INSERT OR IGNORE INTO user_recovery (email, recovery_email) VALUES (?, ?)",
  ).run(mailbox.email, recoveryEmail);

  db.prepare(
    "INSERT INTO reset_tokens (email, token_hash, expires_at) VALUES (?, ?, ?)",
  ).run(mailbox.email, hashedToken, expiresAt);

  const resetLink = `${BASE_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(mailbox.email)}`;

  // Send email via SMTP
  const smtpOptions: Record<string, unknown> = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    ignoreTLS: SMTP_PORT !== 465 && !SMTP_USER,
  };

  if (SMTP_USER && SMTP_PASS) {
    smtpOptions.auth = { user: SMTP_USER, pass: SMTP_PASS };
  }

  try {
    const transporter = nodemailer.createTransport(smtpOptions);

    await transporter.sendMail({
      from: SMTP_FROM,
      to: recoveryEmail,
      subject: `Password Reset for ${mailbox.email}`,
      text: [
        `A password reset was requested for the mailbox: ${mailbox.email}`,
        ``,
        `Click the link below to reset your password:`,
        resetLink,
        ``,
        `If you did not request this, please ignore this email.`,
        `This link expires in 1 hour.`,
      ].join("\n"),
    });
  } catch (err) {
    log("error", "Failed to send reset email", { error: String(err) });
    const response = NextResponse.json({
      error: "Failed to send the recovery email. The mail server may be unavailable.",
    }, { status: 422 });
    logResponse(request, response, startTime);
    return response;
  }

  log("info", "Reset email sent", { email: mailbox.email, recoveryEmail });

  const response = NextResponse.json({ success: true, message: `Reset email sent to ${recoveryEmail}` });
  logResponse(request, response, startTime);
  return response;
}
