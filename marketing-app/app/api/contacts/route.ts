import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);
  const listId = searchParams.get("list_id");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  let where = "WHERE user_id = ?";
  const params: any[] = [user.id];
  if (listId) { where += " AND list_id = ?"; params.push(listId); }
  if (status) { where += " AND status = ?"; params.push(status); }
  if (search) { where += " AND (email LIKE ? OR name LIKE ? OR company LIKE ?)"; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  const total = (db.prepare(`SELECT COUNT(*) as count FROM marketing_contacts ${where}`).get(...params) as any).count;
  const contacts = db.prepare(`SELECT * FROM marketing_contacts ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

  return NextResponse.json({ contacts, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  try {
    const body = await req.json();
    const { list_id, email, name, company, phone, custom_fields = {} } = body;
    if (!list_id || !email) return NextResponse.json({ error: "list_id and email are required" }, { status: 400 });

    // Verify the list belongs to this user
    const list = db.prepare("SELECT id FROM marketing_lists WHERE id = ? AND user_id = ?").get(list_id, user.id);
    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO marketing_contacts (id, user_id, list_id, email, name, company, phone, custom_fields)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, user.id, list_id, email, name || null, company || null, phone || null, JSON.stringify(custom_fields));

    const contact = db.prepare("SELECT * FROM marketing_contacts WHERE id = ?").get(id);
    return NextResponse.json(contact, { status: 201 });
  } catch (err: any) {
    if (err.message?.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "Contact with this email already exists in this list" }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
