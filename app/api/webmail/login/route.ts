import { NextResponse } from "next/server";
import { normalizeMailboxEmail, verifyMailboxLogin } from "@/lib/webmail";
import { setWebmailSession } from "@/lib/webmail-session";

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
    await setWebmailSession(email, password);
    return NextResponse.json({ email });
  } catch {
    return NextResponse.json({ error: "Email address or password is incorrect." }, { status: 401 });
  }
}
