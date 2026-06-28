import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const segment = db.prepare("SELECT * FROM marketing_segments WHERE id = ? AND user_id = ?").get(id, user.id);
  if (!segment) return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  return NextResponse.json(segment);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const existing = db.prepare("SELECT * FROM marketing_segments WHERE id = ? AND user_id = ?").get(id, user.id);
  if (!existing) return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  try {
    const body = await req.json();
    if (body.name) {
      db.prepare("UPDATE marketing_segments SET name = ?, description = ?, rules = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?").run(body.name, body.description || "", JSON.stringify(body.rules || []), id, user.id);
    }
    const updated = db.prepare("SELECT * FROM marketing_segments WHERE id = ? AND user_id = ?").get(id, user.id);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const existing = db.prepare("SELECT * FROM marketing_segments WHERE id = ? AND user_id = ?").get(id, user.id);
  if (!existing) return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  db.prepare("DELETE FROM marketing_segments WHERE id = ? AND user_id = ?").run(id, user.id);
  return NextResponse.json({ success: true });
}
