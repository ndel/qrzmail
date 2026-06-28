import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const template = db.prepare("SELECT * FROM marketing_templates WHERE id = ? AND owner_id = ?").get(id, user.id);
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json(template);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = db.prepare("SELECT * FROM marketing_templates WHERE id = ? AND owner_id = ?").get(id, user.id);
  if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  try {
    const body = await req.json();
    const fields = ["name", "subject", "html_content", "plain_content"];
    const sets: string[] = [];
    const vals: any[] = [];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(body[f]); }
    }
    if (body.variables) { sets.push("variables = ?"); vals.push(JSON.stringify(body.variables)); }
    if (sets.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    sets.push("updated_at = datetime('now')");
    vals.push(id);
    db.prepare(`UPDATE marketing_templates SET ${sets.join(", ")} WHERE id = ? AND owner_id = ?`).run(...vals, user.id);
    const updated = db.prepare("SELECT * FROM marketing_templates WHERE id = ? AND owner_id = ?").get(id, user.id);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = db.prepare("SELECT * FROM marketing_templates WHERE id = ? AND owner_id = ?").get(id, user.id);
  if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  db.prepare("DELETE FROM marketing_templates WHERE id = ? AND owner_id = ?").run(id, user.id);
  return NextResponse.json({ success: true });
}
