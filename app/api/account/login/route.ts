import { NextResponse } from "next/server";
import { createSessionToken, hashPassword, verifyPassword } from "@/lib/auth";
import { makeId, nowIso, readData, updateData } from "@/lib/store";
import { normalizeEmail } from "@/lib/validation";
import { log, logRequest, logResponse, parseJsonBody, setCsrfCookie } from "@/lib/middleware";
import tls from "node:tls";

export const runtime = "nodejs";

const MAIL_DOMAIN = process.env.MAIL_DOMAIN ?? "qrzmail.com";
const IMAP_HOST = process.env.IMAP_HOST ?? "mail.qrzmail.com";
const IMAP_PORT = Number(process.env.IMAP_PORT ?? 993);
const IMAP_SERVERNAME = process.env.IMAP_SERVERNAME ?? IMAP_HOST;

type LoginBody = {
  email?: string;
  password?: string;
};

function quoteImap(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function readUntil(socket: tls.TLSSocket, matcher: RegExp, timeoutMs = 8000) {
  return new Promise<string>((resolve, reject) => {
    let buffer = "";
    const timeout = setTimeout(() => cleanup(reject, new Error("IMAP timed out.")), timeoutMs);

    function cleanup(callback: (value: never) => void, value: Error): void;
    function cleanup(callback: (value: string) => void, value: string): void;
    function cleanup(callback: ((value: never) => void) | ((value: string) => void), value: Error | string) {
      clearTimeout(timeout);
      socket.off("data", onData);
      socket.off("error", onError);
      callback(value as never);
    }

    function onData(chunk: Buffer) {
      buffer += chunk.toString("utf8");
      if (matcher.test(buffer)) {
        cleanup(resolve, buffer);
      }
    }

    function onError(error: Error) {
      cleanup(reject, error);
    }

    socket.on("data", onData);
    socket.on("error", onError);
  });
}

async function verifyImapLogin(email: string, password: string) {
  const socket = tls.connect({
    host: IMAP_HOST,
    port: IMAP_PORT,
    servername: IMAP_SERVERNAME,
  });

  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("secureConnect", resolve);
      socket.once("error", reject);
      socket.setTimeout(9000, () => reject(new Error("IMAP connection timed out.")));
    });

    await readUntil(socket, /^\* OK/m);
    socket.write(`a1 LOGIN ${quoteImap(email)} ${quoteImap(password)}\r\n`);
    const loginResponse = await readUntil(socket, /^a1 (OK|NO|BAD)/m);
    socket.write("a2 LOGOUT\r\n");

    return /^a1 OK/m.test(loginResponse);
  } finally {
    socket.destroy();
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  logRequest(request, startTime);

  // Parse body with size limit
  const parsed = await parseJsonBody<LoginBody>(request);
  if (!parsed.ok) {
    logResponse(request, parsed.error, startTime);
    return parsed.error;
  }
  const body = parsed.data;

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";

  // Step 1: Try to find user in SQLite (existing domain management account)
  const data = await readData();
  let user = data.users.find((candidate) => candidate.email === email);

  if (user) {
    // Existing domain management user — verify password hash
    if (!verifyPassword(password, user.passwordHash)) {
      // Local hash didn't match — try IMAP fallback for @qrzmail.com users.
      // This handles the case where the password was changed via the reset-password
      // endpoint (which updates Mailcow but not the local SQLite hash).
      if (!email.endsWith(`@${MAIL_DOMAIN}`)) {
        const response = NextResponse.json({ error: "Email address or password is incorrect." }, { status: 401 });
        logResponse(request, response, startTime);
        return response;
      }

      const imapValid = await verifyImapLogin(email, password).catch(() => false);
      if (!imapValid) {
        const response = NextResponse.json({ error: "Email address or password is incorrect." }, { status: 401 });
        logResponse(request, response, startTime);
        return response;
      }

      // IMAP auth succeeded — update local password hash so subsequent logins
      // don't need the IMAP round-trip
      const newHash = hashPassword(password);
      await updateData((data) => {
        const existing = data.users.find((c) => c.email === email);
        if (existing) {
          existing.passwordHash = newHash;
        }
      });

      log("info", "Updated local password hash via IMAP fallback", { email });
    }
  } else {
    // Step 2: No domain management account yet — try IMAP auth (webmail user)
    // Only attempt IMAP auth for @qrzmail.com addresses
    if (!email.endsWith(`@${MAIL_DOMAIN}`)) {
      const response = NextResponse.json({ error: "Email address or password is incorrect." }, { status: 401 });
      logResponse(request, response, startTime);
      return response;
    }

    const imapValid = await verifyImapLogin(email, password).catch(() => false);
    if (!imapValid) {
      const response = NextResponse.json({ error: "Email address or password is incorrect." }, { status: 401 });
      logResponse(request, response, startTime);
      return response;
    }

    // Step 3: IMAP auth succeeded — auto-create domain management account
    const name = email.split("@")[0]; // use local part as name
    const passwordHash = hashPassword(password);

    user = await updateData((data) => {
      // Double-check it wasn't created by another concurrent request
      const existing = data.users.find((c) => c.email === email);
      if (existing) {
        return existing;
      }

      const created = {
        id: makeId(),
        email,
        name,
        passwordHash,
        role: "owner" as const,
        subscription: "free" as const,
        createdAt: nowIso(),
      };
      data.users.push(created);
      return created;
    });

    log("info", "Auto-created domain management account via IMAP auth", { email });
  }

  // Build the session token and CSRF token.
  const sessionToken = createSessionToken(user);

  // Create the initial response so we can set cookies on it.
  const response = NextResponse.json({
    user: { email: user.email, name: user.name, role: user.role },
  });

  // Set session cookie
  response.cookies.set("qrzmail_session", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  // Set CSRF cookie and capture the token for the response body
  const csrfToken = setCsrfCookie(response);

  // Re-create the response with the CSRF token in the body, preserving cookies
  const finalResponse = NextResponse.json({
    user: { email: user.email, name: user.name, role: user.role },
    csrfToken,
  });

  // Copy cookies from the first response to the new one using the internal cookie store
  // (more reliable than reading the Set-Cookie header)
  const cookies = response.cookies.getAll();
  for (const cookie of cookies) {
    finalResponse.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite as "lax" | "strict" | "none" | undefined,
      secure: cookie.secure,
      path: cookie.path,
      maxAge: cookie.maxAge,
    });
  }

  logResponse(request, finalResponse, startTime);
  return finalResponse;
}
