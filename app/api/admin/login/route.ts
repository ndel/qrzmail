import { NextResponse } from "next/server";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
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
  const body = parsed.data;

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";

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

  await setSessionCookie(user);

  // Set CSRF cookie for subsequent state-changing requests
  const response = NextResponse.json({
    user: { email: user.email, name: user.name, role: user.role },
  });
  setCsrfCookie(response);

  log("info", "Admin logged in", { email: user.email });
  logResponse(request, response, startTime);
  return response;
}
