import { NextResponse } from "next/server";
import { createSessionToken, verifyPassword } from "@/lib/auth";
import { readData } from "@/lib/store";
import { normalizeEmail } from "@/lib/validation";
import { log, logRequest, logResponse, parseJsonBody, setCsrfCookie } from "@/lib/middleware";

export const runtime = "nodejs";

type AdminLoginBody = {
  email?: string;
  password?: string;
};

/**
 * POST /api/admin/login
 *
 * Authenticates a superadmin user. Only users with role "superadmin"
 * are allowed to log in via this endpoint.
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  logRequest(request, startTime);

  // Parse body with size limit
  const parsed = await parseJsonBody<AdminLoginBody>(request);
  if (!parsed.ok) {
    logResponse(request, parsed.error, startTime);
    return parsed.error;
  }
  const loginBody = parsed.data;

  const email = normalizeEmail(loginBody.email ?? "");
  const password = loginBody.password ?? "";

  const data = await readData();
  const user = data.users.find(
    (candidate) => candidate.email === email && candidate.role === "superadmin",
  );

  if (!user || !verifyPassword(password, user.passwordHash)) {
    log("warn", "Failed admin login attempt", { email });
    const response = NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
    logResponse(request, response, startTime);
    return response;
  }

  // Build the session token
  const sessionToken = createSessionToken(user);

  // Create the final response with CSRF token in the body
  const response = NextResponse.json({
    user: { email: user.email, name: user.name, role: user.role },
    csrfToken: "",
  });

  // Set session cookie directly on the final response
  response.cookies.set("qrzmail_session", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  // Set CSRF cookie directly on the final response and capture the token
  const csrfToken = setCsrfCookie(response);

  // Now update the response body with the actual CSRF token.
  // We can't modify the body of an existing NextResponse.json(), so we
  // need to create a new one. But we must preserve the cookies that were
  // set via response.cookies.set().
  //
  // In Next.js, response.cookies.set() stores cookies in an internal
  // ResponseCookies object, NOT in the Headers. So response.headers.get("set-cookie")
  // returns null. To preserve cookies, we read them from the internal store
  // and set them on the new response.
  const finalResponse = NextResponse.json({
    user: { email: user.email, name: user.name, role: user.role },
    csrfToken,
  });

  // Copy cookies from the first response to the new one
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

  log("info", "Admin logged in", { email: user.email });
  logResponse(request, finalResponse, startTime);
  return finalResponse;
}
