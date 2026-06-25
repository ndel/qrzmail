import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { log, logRequest, logResponse, parseJsonBody, checkRateLimit, cleanRateLimits } from "@/lib/middleware";

export const runtime = "nodejs";

const MAIL_DOMAIN = process.env.MAIL_DOMAIN ?? "qrzmail.com";
const MAILCOW_API_URL = process.env.MAILCOW_API_URL ?? "https://mail.qrzmail.com";
const MAILCOW_API_KEY = process.env.MAILCOW_API_KEY;

const execAsync = promisify(exec);

type SignupBody = {
  localPart?: string;
  name?: string;
  password?: string;
  recoveryEmail?: string;
};

function normalizeLocalPart(value: string) {
  return value.trim().toLowerCase();
}

function isValidLocalPart(value: string) {
  return /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/.test(value);
}

function isStrongEnough(password: string) {
  return password.length >= 10 && /[a-zA-Z]/.test(password) && /\d/.test(password);
}

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  const startTime = Date.now();
  logRequest(request, startTime);

  if (!MAILCOW_API_KEY) {
    const response = NextResponse.json(
      { error: "Signup is not configured. Missing MAILCOW_API_KEY." },
      { status: 500 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  // Persistent SQLite-backed rate limiting (survives restarts)
  const clientKey = getClientKey(request);
  const retryAfter = checkRateLimit(`signup:${clientKey}`, 5);
  if (retryAfter) {
    log("warn", "Rate limit exceeded for signup", { ip: clientKey, retryAfter });
    const response = NextResponse.json(
      { error: "Too many signup attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
    logResponse(request, response, startTime);
    return response;
  }

  // Parse body with size limit (100 KB max)
  const parsed = await parseJsonBody<SignupBody>(request);
  if (!parsed.ok) {
    logResponse(request, parsed.error, startTime);
    return parsed.error;
  }
  const body = parsed.data;

  const localPart = normalizeLocalPart(body.localPart ?? "");
  const password = body.password ?? "";
  const name = (body.name ?? localPart).trim().slice(0, 80);
  const recoveryEmail = body.recoveryEmail?.trim().toLowerCase();

  if (!isValidLocalPart(localPart)) {
    const response = NextResponse.json(
      { error: "Use 3-32 lowercase letters, numbers, dots, dashes, or underscores." },
      { status: 400 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  if (!isStrongEnough(password)) {
    const response = NextResponse.json(
      { error: "Password must be at least 10 characters and include a letter and number." },
      { status: 400 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  if (recoveryEmail && !/^.+@.+\..+$/.test(recoveryEmail)) {
    const response = NextResponse.json(
      { error: "Please provide a valid recovery email address." },
      { status: 400 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  const mailcowResponse = await fetch(`${MAILCOW_API_URL}/api/v1/add/mailbox`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": MAILCOW_API_KEY,
    },
    body: JSON.stringify({
      active: 1,
      authsource: "mailcow",
      domain: MAIL_DOMAIN,
      force_pw_update: 0,
      local_part: localPart,
      name,
      password,
      password2: password,
      quota: 3072,
      tls_enforce_in: 0,
      tls_enforce_out: 0,
    }),
  });

  const result = await mailcowResponse.json().catch(() => null);

  if (!mailcowResponse.ok) {
    log("error", "Mailcow signup request failed", {
      status: mailcowResponse.status,
      localPart,
    });

    const response = NextResponse.json(
      { error: "Mail server rejected the signup request." },
      { status: 422 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  const entries = Array.isArray(result) ? result : [result];
  const failed = entries.find((entry) => entry?.type && entry.type !== "success");

  if (failed) {
    const response = NextResponse.json(
      { error: Array.isArray(failed.msg) ? failed.msg.join(" ") : "Mailbox could not be created." },
      { status: 400 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  const emailAddress = `${localPart}@${MAIL_DOMAIN}`;
  
  // Store Recovery Data & Generate Codes
  let rawCodes: string[] = [];
  try {
    const db = (await import("@/lib/db")).default;
    const bcrypt = await import("bcrypt");
    
    db.prepare("INSERT INTO user_recovery (email, recovery_email) VALUES (?, ?)").run(emailAddress, recoveryEmail || null);
    
    // Generate 10 codes
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No similar characters like I/1 or O/0
    const insertCode = db.prepare("INSERT INTO recovery_codes (email, code_hash) VALUES (?, ?)");
    
    // Generate 8 random chars (no dash), store hash of that.
    // Display as XXXX-XXXX for readability. Verification strips dash before comparing.
    const generateCode = () => {
      let raw = "";
      for (let i = 0; i < 8; i++) {
        raw += charset[Math.floor(Math.random() * charset.length)];
      }
      return raw; // e.g. "ABCD1234" — stored hashed, displayed as "ABCD-1234"
    };

    const transaction = db.transaction(() => {
      for (let i = 0; i < 10; i++) {
        const rawCode = generateCode(); // 8 chars, no dash
        rawCodes.push(`${rawCode.slice(0,4)}-${rawCode.slice(4)}`); // display with dash
        const hashed = bcrypt.hashSync(rawCode, 10); // hash without dash
        insertCode.run(emailAddress, hashed);
      }
    });
    
    transaction();
  } catch (err) {
    log("error", "Failed to store recovery info", { error: String(err) });
    rawCodes = [];
  }

  // Initialize IMAP folders via Dovecot so the mailbox is ready for webmail login immediately
  try {
    const folders = ["INBOX", "Drafts", "Sent", "Trash", "Junk"];
    for (const folder of folders) {
      await execAsync(
        `docker exec mailcowdockerized-dovecot-mailcow-1 doveadm mailbox create -u ${emailAddress} ${folder} 2>/dev/null || true`
      );
    }
    log("info", "Initialized IMAP folders", { email: emailAddress });
  } catch (err) {
    log("warn", "Could not pre-init IMAP folders", { email: emailAddress, error: String(err) });
    // Non-fatal — SOGo creates them on first login anyway
  }

  // ── Auto-create domain management account ──────────────────────────────
  // Every webmail signup also creates a domain management user in SQLite so
  // the same credentials can be used to log into /domains/login.
  try {
    const { hashPassword } = await import("@/lib/auth");
    const { makeId, nowIso } = await import("@/lib/store");
    const db = (await import("@/lib/db")).default;

    // Check if a domain management user already exists for this email
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(emailAddress) as { id: string } | undefined;
    if (!existing) {
      const passwordHash = hashPassword(password);
      db.prepare(
        "INSERT INTO users (id, email, name, password_hash, role, subscription, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(makeId(), emailAddress, name, passwordHash, "owner", "free", nowIso());
      log("info", "Auto-created domain management account", { email: emailAddress });
    }
  } catch (err) {
    log("error", "Failed to auto-create domain management account", { email: emailAddress, error: String(err) });
    // Non-fatal — user can still use webmail; they'll get an account on first domain login
  }

  // ── Sync mailbox to local SQLite ──────────────────────────────────────
  // Insert a record into the local mailboxes table so the superadmin panel
  // and password-reset endpoint can see this mailbox.
  try {
    const { makeId, nowIso } = await import("@/lib/store");
    const db = (await import("@/lib/db")).default;

    // Look up the domain_id for MAIL_DOMAIN
    const domain = db.prepare("SELECT id FROM domains WHERE domain = ?").get(MAIL_DOMAIN) as { id: string } | undefined;
    if (!domain) {
      log("warn", "Cannot sync mailbox to local table — domain not found in local DB", { domain: MAIL_DOMAIN });
    } else {
      // Look up the owner_id for this email (should have been created above)
      const user = db.prepare("SELECT id FROM users WHERE email = ?").get(emailAddress) as { id: string } | undefined;
      const ownerId = user?.id ?? null;

      // Check if a mailbox record already exists for this email
      const existing = db.prepare("SELECT id FROM mailboxes WHERE email = ?").get(emailAddress);
      if (!existing) {
        db.prepare(
          "INSERT INTO mailboxes (id, owner_id, domain_id, email, name, quota_mb, recovery_email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(makeId(), ownerId, domain.id, emailAddress, name, 3072, recoveryEmail || null, nowIso());
        log("info", "Synced mailbox to local SQLite", { email: emailAddress });
      }
    }
  } catch (err) {
    log("error", "Failed to sync mailbox to local SQLite", { email: emailAddress, error: String(err) });
    // Non-fatal — mailbox still exists in Mailcow
  }

  // Clean up old rate limit entries (housekeeping)
  try {
    cleanRateLimits();
  } catch {
    // Non-critical
  }

  const response = NextResponse.json({ email: emailAddress, codes: rawCodes });
  logResponse(request, response, startTime);
  return response;
}
