import { NextResponse } from "next/server";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { makeId, nowIso, updateData } from "@/lib/store";
import { isStrongPassword, isValidEmail, normalizeEmail } from "@/lib/validation";
import { log, logRequest, logResponse, parseJsonBody } from "@/lib/middleware";

export const runtime = "nodejs";

type RegisterBody = {
  email?: string;
  name?: string;
  password?: string;
};

export async function POST(request: Request) {
  const startTime = Date.now();
  logRequest(request, startTime);

  // Parse body with size limit
  const parsed = await parseJsonBody<RegisterBody>(request);
  if (!parsed.ok) {
    logResponse(request, parsed.error, startTime);
    return parsed.error;
  }
  const body = parsed.data;

  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  const name = (body.name ?? email).trim().slice(0, 80);

  if (!isValidEmail(email)) {
    const response = NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
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

  const user = await updateData((data) => {
    if (data.users.some((existing) => existing.email === email)) {
      return null;
    }

    const created = {
      id: makeId(),
      email,
      name,
      passwordHash: hashPassword(password),
      role: "owner" as const,
      subscription: "free" as const,
      createdAt: nowIso(),
    };
    data.users.push(created);
    return created;
  });

  if (!user) {
    const response = NextResponse.json({ error: "That account already exists." }, { status: 409 });
    logResponse(request, response, startTime);
    return response;
  }

  await setSessionCookie(user);
  log("info", "Account registered", { email });

  const response = NextResponse.json({ user: { email: user.email, name: user.name, role: user.role } });
  logResponse(request, response, startTime);
  return response;
}
