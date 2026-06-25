import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { log, logRequest, logResponse, parseJsonBody } from "@/lib/middleware";

export const runtime = "nodejs";

const SMTP_HOST = process.env.SMTP_HOST || "postfix-mailcow";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "25", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || '"QRZMail Support" <noreply@qrzmail.com>';
const BASE_URL = process.env.BASE_URL || "https://qrzmail.com";

export async function POST(request: Request) {
  const startTime = Date.now();
  logRequest(request, startTime);

  try {
    // Parse body with size limit
    const parsed = await parseJsonBody<Record<string, unknown>>(request);
    if (!parsed.ok) {
      logResponse(request, parsed.error, startTime);
      return parsed.error;
    }
    const body = parsed.data;

    const { action, email, code } = body;

    if (!email) {
      const response = NextResponse.json({ error: "Email is required" }, { status: 400 });
      logResponse(request, response, startTime);
      return response;
    }

    const emailStr = (email as string).trim().toLowerCase();

    if (action === "lookup") {
      log("info", "Forgot-password lookup", { email: emailStr });
      const user = db.prepare("SELECT recovery_email FROM user_recovery WHERE email = ?").get(emailStr) as { recovery_email: string | null } | undefined;

      if (!user) {
        // No user_recovery row exists — check if there are any recovery codes anyway
        const codeCount = db.prepare("SELECT COUNT(*) AS cnt FROM recovery_codes WHERE email = ?").get(emailStr) as { cnt: number } | undefined;
        const totalCodes = codeCount?.cnt ?? 0;
        const unusedCodes = (db.prepare("SELECT COUNT(*) AS cnt FROM recovery_codes WHERE email = ? AND used = 0").get(emailStr) as { cnt: number } | undefined)?.cnt ?? 0;
        log("info", "No user_recovery row", { email: emailStr, totalCodes, unusedCodes });
        const response = NextResponse.json({ hasRecoveryEmail: false, hasBackupCodes: totalCodes > 0 });
        logResponse(request, response, startTime);
        return response;
      }

      log("info", "Found user_recovery", { email: emailStr, hasRecoveryEmail: !!user.recovery_email });
      const response = NextResponse.json({ hasRecoveryEmail: !!user.recovery_email, hasBackupCodes: true });
      logResponse(request, response, startTime);
      return response;
    }

    if (action === "send_email") {
      const user = db.prepare("SELECT recovery_email FROM user_recovery WHERE email = ?").get(emailStr) as { recovery_email: string | null } | undefined;

      if (!user || !user.recovery_email) {
        const response = NextResponse.json({ error: "No recovery email found for this account." }, { status: 400 });
        logResponse(request, response, startTime);
        return response;
      }

      // Generate a reset token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = bcrypt.hashSync(rawToken, 10);
      const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour

      db.prepare("INSERT INTO reset_tokens (email, token_hash, expires_at) VALUES (?, ?, ?)").run(emailStr, hashedToken, expiresAt);

      const resetLink = `${BASE_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(emailStr)}`;

      log("info", "Reset link generated", { email: emailStr, recoveryEmail: user.recovery_email });

      // Send email via SMTP
      const smtpOptions: Record<string, unknown> = {
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        ignoreTLS: SMTP_PORT !== 465 && !SMTP_USER, // Only ignoreTLS if no auth and not secure port
      };

      // Add auth if credentials are provided
      if (SMTP_USER && SMTP_PASS) {
        smtpOptions.auth = {
          user: SMTP_USER,
          pass: SMTP_PASS,
        };
      }

      try {
        const transporter = nodemailer.createTransport(smtpOptions);

        await transporter.sendMail({
          from: SMTP_FROM,
          to: user.recovery_email,
          subject: "Password Reset Request",
          text: `You requested a password reset for ${emailStr}.\n\nClick the link below to reset your password:\n${resetLink}\n\nIf you did not request this, please ignore this email.\n\nThis link expires in 1 hour.`,
        });

        log("info", "Reset email sent", { email: emailStr, recoveryEmail: user.recovery_email });
      } catch (err) {
        log("error", "Failed to send SMTP email", { error: String(err) });
        // Return error to the user so they know the email wasn't sent
        const response = NextResponse.json({
          error: "Failed to send the recovery email. The mail server may be unavailable. Please try again later or use a backup code.",
          smtpError: true,
        }, { status: 422 });
        logResponse(request, response, startTime);
        return response;
      }

      const response = NextResponse.json({ success: true });
      logResponse(request, response, startTime);
      return response;
    }

    if (action === "verify_code") {
      if (!code) {
        const response = NextResponse.json({ error: "Backup code is required" }, { status: 400 });
        logResponse(request, response, startTime);
        return response;
      }

      // Strip non-alphanumeric chars and uppercase — codes are stored as 8-char hash (no dash)
      const rawCode = (code as string).replace(/[^A-Z0-9]/gi, "").toUpperCase();
      log("info", "Verifying backup code", { email: emailStr, codeLength: rawCode.length });

      if (rawCode.length !== 8) {
        const response = NextResponse.json({ error: "Backup code must be 8 characters (e.g. XXXX-XXXX)" }, { status: 400 });
        logResponse(request, response, startTime);
        return response;
      }

      // Find all unused codes for this user
      const codes = db.prepare("SELECT id, code_hash FROM recovery_codes WHERE email = ? AND used = 0").all(emailStr) as { id: number, code_hash: string }[];

      log("info", "Unused codes found", { email: emailStr, count: codes.length });

      if (codes.length === 0) {
        // Also check if there are any codes at all (used or unused)
        const totalCodes = (db.prepare("SELECT COUNT(*) AS cnt FROM recovery_codes WHERE email = ?").get(emailStr) as { cnt: number } | undefined)?.cnt ?? 0;
        log("info", "Total recovery codes", { email: emailStr, totalCodes });
        const response = NextResponse.json({ error: "No unused backup codes found for this account. Please contact support." }, { status: 400 });
        logResponse(request, response, startTime);
        return response;
      }

      let validCodeId = null;
      for (const row of codes) {
        if (bcrypt.compareSync(rawCode, row.code_hash)) {
          validCodeId = row.id;
          break;
        }
      }

      if (!validCodeId) {
        log("warn", "Backup code did not match any stored hashes", { email: emailStr });
        const response = NextResponse.json({ error: "Invalid backup code. Please check the code and try again." }, { status: 400 });
        logResponse(request, response, startTime);
        return response;
      }

      log("info", "Backup code matched", { email: emailStr, codeId: validCodeId });

      // Generate a temporary reset token and mark code as used
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = bcrypt.hashSync(rawToken, 10);
      const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour

      const transaction = db.transaction(() => {
        db.prepare("UPDATE recovery_codes SET used = 1 WHERE id = ?").run(validCodeId);
        db.prepare("INSERT INTO reset_tokens (email, token_hash, expires_at) VALUES (?, ?, ?)").run(emailStr, hashedToken, expiresAt);
      });
      transaction();

      const response = NextResponse.json({ success: true, token: rawToken });
      logResponse(request, response, startTime);
      return response;
    }

    const response = NextResponse.json({ error: "Invalid action" }, { status: 400 });
    logResponse(request, response, startTime);
    return response;

  } catch (error) {
    log("error", "Forgot password error", { error: String(error) });
    const response = NextResponse.json({ error: "Internal server error" }, { status: 500 });
    logResponse(request, response, startTime);
    return response;
  }
}
