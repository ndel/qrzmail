import { NextResponse } from "next/server";
import { getWebmailSession } from "@/lib/webmail-session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getWebmailSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, email: session.email });
}
