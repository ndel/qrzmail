import { NextResponse } from "next/server";
import { createSessionToken, verifyPassword } from "@/lib/auth";
import { readData } from "@/lib/store";
import { normalizeEmail } from "@/lib/validation";
import { log, logRequest, logResponse, parseJsonBody } from "@/lib/middleware";
import { generateCsrfToken, setAccountAuthCookies } from "@/lib/session";

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

  const csrfToken = generateCsrfToken();
  const finalResponse = NextResponse.json({
    user: { email: user.email, name: user.name, role: user.role },
    csrfToken,
  });
  setAccountAuthCookies(finalResponse, sessionToken, csrfToken);

  log("info", "Admin logged in", { email: user.email });
  logResponse(request, finalResponse, startTime);
  return finalResponse;
}
