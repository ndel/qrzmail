import { NextResponse } from "next/server";
import { listMessages } from "@/lib/webmail";
import { getWebmailSession } from "@/lib/webmail-session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getWebmailSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const folder = url.searchParams.get("folder") || "INBOX";
  const search = url.searchParams.get("q") || "";
  const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit") ?? 50)));

  try {
    const messages = await listMessages(session, folder, limit, search);
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: "Could not load messages." }, { status: 502 });
  }
}
