import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  const lists = db.prepare(`
    SELECT l.*,
      (SELECT COUNT(*) FROM marketing_contacts WHERE list_id = l.id) as total_contacts,
      (SELECT COUNT(*) FROM marketing_contacts WHERE list_id = l.id AND status = 'active') as active_contacts
    FROM marketing_lists l WHERE l.user_id = ? ORDER BY l.created_at DESC
  `).all(user.id);
  return NextResponse.json(lists);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  try {
    const body = await req.json();
    const id = crypto.randomUUID();
    const { name, description = "" } = body;
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    db.prepare("INSERT INTO marketing_lists (id, user_id, name, description) VALUES (?, ?, ?, ?)").run(id, user.id, name, description);
    const list = db.prepare("SELECT * FROM marketing_lists WHERE id = ?").get(id);
    return NextResponse.json(list, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
