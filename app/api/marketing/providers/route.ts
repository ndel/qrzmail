import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const providers = db.prepare("SELECT * FROM marketing_providers WHERE owner_id = ? ORDER BY created_at DESC").all(user.id);
  return NextResponse.json(providers);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const id = crypto.randomUUID();
    const {
      name = "Default",
      smtp_host, smtp_port = 587, smtp_user, smtp_pass, smtp_secure = true,
      imap_host, imap_port = 993, imap_user, imap_pass, imap_secure = true,
      daily_limit = 300, monthly_limit = 9000,
    } = body;

    if (!smtp_host || !smtp_user || !smtp_pass || !imap_host || !imap_user || !imap_pass) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    db.prepare(`
      INSERT INTO marketing_providers (id, owner_id, name, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, imap_host, imap_port, imap_user, imap_pass, imap_secure, daily_limit, monthly_limit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, user.id, name, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure ? 1 : 0, imap_host, imap_port, imap_user, imap_pass, imap_secure ? 1 : 0, daily_limit, monthly_limit);

    const provider = db.prepare("SELECT * FROM marketing_providers WHERE id = ?").get(id);
    return NextResponse.json(provider, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
