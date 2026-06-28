import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const campaign = db.prepare(`
    SELECT c.*, p.name as provider_name, p.smtp_host, t.name as template_name, t.subject as template_subject, l.name as list_name
    FROM marketing_campaigns c
    LEFT JOIN marketing_providers p ON p.id = c.provider_id AND p.owner_id = ?
    LEFT JOIN marketing_templates t ON t.id = c.template_id AND t.owner_id = ?
    LEFT JOIN marketing_lists l ON l.id = c.list_id AND l.owner_id = ?
    WHERE c.id = ? AND c.owner_id = ?
  `).get(user.id, user.id, user.id, id, user.id);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = db.prepare("SELECT * FROM marketing_campaigns WHERE id = ? AND owner_id = ?").get(id, user.id);
  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  try {
    const body = await req.json();
    const fields = ["name", "provider_id", "template_id", "list_id", "scheduled_at"];
    const sets: string[] = [];
    const vals: any[] = [];
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(body[f]); }
    }
    if (sets.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    sets.push("updated_at = datetime('now')");
    vals.push(id);
    db.prepare(`UPDATE marketing_campaigns SET ${sets.join(", ")} WHERE id = ? AND owner_id = ?`).run(...vals, user.id);
    const updated = db.prepare("SELECT * FROM marketing_campaigns WHERE id = ? AND owner_id = ?").get(id, user.id);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = db.prepare("SELECT * FROM marketing_campaigns WHERE id = ? AND owner_id = ?").get(id, user.id);
  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  db.prepare("DELETE FROM marketing_campaigns WHERE id = ? AND owner_id = ?").run(id, user.id);
  return NextResponse.json({ success: true });
}
