import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const provider = db.prepare("SELECT * FROM marketing_providers WHERE id = ? AND user_id = ?").get(id, user.id);
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  return NextResponse.json(provider);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const existing = db.prepare("SELECT * FROM marketing_providers WHERE id = ? AND user_id = ?").get(id, user.id);
  if (!existing) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  try {
    const body = await req.json();
    const fields = ["name", "smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_secure", "imap_host", "imap_port", "imap_user", "imap_pass", "imap_secure", "daily_limit", "monthly_limit"];
    const sets: string[] = [];
    const vals: any[] = [];
    for (const f of fields) {
      if (body[f] !== undefined) {
        if (f === "smtp_secure" || f === "imap_secure") {
          sets.push(`${f} = ?`);
          vals.push(body[f] ? 1 : 0);
        } else {
          sets.push(`${f} = ?`);
          vals.push(body[f]);
        }
      }
    }
    if (sets.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    sets.push("updated_at = datetime('now')");
    vals.push(id);
    db.prepare(`UPDATE marketing_providers SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`).run(...vals, user.id);
    const updated = db.prepare("SELECT * FROM marketing_providers WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const existing = db.prepare("SELECT * FROM marketing_providers WHERE id = ? AND user_id = ?").get(id, user.id);
  if (!existing) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  db.prepare("DELETE FROM marketing_providers WHERE id = ? AND user_id = ?").run(id, user.id);
  return NextResponse.json({ success: true });
}
