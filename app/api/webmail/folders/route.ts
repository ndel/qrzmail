import { NextResponse } from "next/server";
import { listFolders } from "@/lib/webmail";
import { getWebmailSession } from "@/lib/webmail-session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getWebmailSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const folders = await listFolders(session);
    return NextResponse.json({ folders });
  } catch {
    return NextResponse.json({ error: "Could not load folders." }, { status: 502 });
  }
}
