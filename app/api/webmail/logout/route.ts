import { NextResponse } from "next/server";
import { clearWebmailSession } from "@/lib/webmail-session";

export const runtime = "nodejs";

export async function POST() {
  await clearWebmailSession();
  return NextResponse.json({ success: true });
}
