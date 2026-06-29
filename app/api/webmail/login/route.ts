import { NextResponse } from "next/server";
import { normalizeMailboxEmail, verifyMailboxLogin } from "@/lib/webmail";
import { encryptWebmailSession, WEBMAIL_COOKIE_NAME } from "@/lib/webmail-session";
import { createSessionToken, hashPassword } from "@/lib/auth";
import {
  setAccountAuthCookies,
  setWebmailSessionCookie,
  WEBMAIL_SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";
import { makeId, nowIso, readData, updateData } from "@/lib/store";
import { log } from "@/lib/middleware";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = normalizeMailboxEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    await verifyMailboxLogin({ email, password });

    // ── Create/sync the account session ──────────────────────────────
    // This ensures the user is also logged into the domain management
    // and marketing panels when they log in via the webmail page.
    const data = await readData();
    let user = data.users.find((candidate) => candidate.email === email);

    if (!user) {
      // Auto-create domain management account (same logic as /api/account/login)
      const name = email.split("@")[0];
      const passwordHash = hashPassword(password);
      user = await updateData((data) => {
        const existing = data.users.find((c) => c.email === email);
        if (existing) return existing;
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
      log("info", "Auto-created domain management account via webmail login", { email });
    }

    const sessionToken = createSessionToken(user, password);
    const response = NextResponse.json({ email });

    // Set ALL cookies on the response object to avoid conflicts between
    // the cookies() API (next/headers) and response.cookies.set().
    setAccountAuthCookies(response, sessionToken);

    // Set the webmail session cookie on the response too (not via cookies() API)
    const webmailPayload = {
      email,
      password,
      exp: Date.now() + WEBMAIL_SESSION_MAX_AGE_SECONDS * 1000,
    };
    const encryptedWebmail = encryptWebmailSession(webmailPayload);
    setWebmailSessionCookie(response, encryptedWebmail);

    return response;
  } catch {
    return NextResponse.json({ error: "Email address or password is incorrect." }, { status: 401 });
  }
}
