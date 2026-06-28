import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const templates = db.prepare("SELECT * FROM marketing_templates WHERE owner_id = ? ORDER BY created_at DESC").all(user.id);
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const id = crypto.randomUUID();
    const { name, subject, html_content, plain_content, variables = [] } = body;
    if (!name || !subject || !html_content) {
      return NextResponse.json({ error: "name, subject, and html_content are required" }, { status: 400 });
    }

    db.prepare(`
      INSERT INTO marketing_templates (id, owner_id, name, subject, html_content, plain_content, variables)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, user.id, name, subject, html_content, plain_content || null, JSON.stringify(variables));

    const template = db.prepare("SELECT * FROM marketing_templates WHERE id = ?").get(id);
    return NextResponse.json(template, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
