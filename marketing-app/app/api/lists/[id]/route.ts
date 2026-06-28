import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const list = db.prepare(`
    SELECT l.*,
      (SELECT COUNT(*) FROM marketing_contacts WHERE list_id = l.id) as total_contacts,
      (SELECT COUNT(*) FROM marketing_contacts WHERE list_id = l.id AND status = 'active') as active_contacts
    FROM marketing_lists l WHERE l.id = ? AND l.user_id = ?
  `).get(id, user.id);
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });
  return NextResponse.json(list);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const existing = db.prepare("SELECT * FROM marketing_lists WHERE id = ? AND user_id = ?").get(id, user.id);
  if (!existing) return NextResponse.json({ error: "List not found" }, { status: 404 });
  try {
    const body = await req.json();
    if (body.name) {
      db.prepare("UPDATE marketing_lists SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?").run(body.name, body.description || "", id, user.id);
    }
    const updated = db.prepare("SELECT * FROM marketing_lists WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const existing = db.prepare("SELECT * FROM marketing_lists WHERE id = ? AND user_id = ?").get(id, user.id);
  if (!existing) return NextResponse.json({ error: "List not found" }, { status: 404 });
  db.prepare("DELETE FROM marketing_lists WHERE id = ? AND user_id = ?").run(id, user.id);
  return NextResponse.json({ success: true });
}
