import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { log, logRequest, logResponse } from "@/lib/middleware";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const startTime = Date.now();
  logRequest(request, startTime);

  await clearSessionCookie();

  log("info", "User logged out");

  const response = NextResponse.json({ ok: true });
  logResponse(request, response, startTime);
  return response;
}
