import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  try {
    const body = await req.json();
    const { list_id, contacts } = body;
    if (!list_id || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: "list_id and contacts array are required" }, { status: 400 });
    }

    // Verify the list belongs to this user
    const list = db.prepare("SELECT id FROM marketing_lists WHERE id = ? AND user_id = ?").get(list_id, user.id);
    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

    const insert = db.prepare(`
      INSERT OR IGNORE INTO marketing_contacts (id, user_id, list_id, email, name, company, phone, custom_fields)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    const transaction = db.transaction(() => {
      for (const c of contacts) {
        if (!c.email) { skipped++; continue; }
        try {
          const result = insert.run(crypto.randomUUID(), user.id, list_id, c.email, c.name || null, c.company || null, c.phone || null, JSON.stringify(c.custom_fields || {}));
          if (result.changes > 0) imported++;
          else skipped++;
        } catch {
          skipped++;
        }
      }
    });

    transaction();
    return NextResponse.json({ imported, skipped, errors }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
