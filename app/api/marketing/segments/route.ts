import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { evaluateSegment, getSuggestedSegments } from "@/lib/marketing/segmentation";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const listId = searchParams.get("list_id");

  const segments = db.prepare("SELECT * FROM marketing_segments WHERE owner_id = ? ORDER BY created_at DESC").all(user.id) as any[];

  if (listId) {
    const suggestions = getSuggestedSegments(listId);
    return NextResponse.json({ segments, suggestions });
  }

  const enriched = segments.map((s: any) => {
    const rules = JSON.parse(s.rules || "[]");
    const lists = db.prepare("SELECT id FROM marketing_lists WHERE owner_id = ?").all(user.id) as any[];
    let totalCount = 0;
    for (const list of lists) {
      totalCount += evaluateSegment(list.id, rules).length;
    }
    return { ...s, contact_count: totalCount };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const id = crypto.randomUUID();
    const { name, description, rules = [] } = body;
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    db.prepare("INSERT INTO marketing_segments (id, owner_id, name, description, rules) VALUES (?, ?, ?, ?, ?)").run(id, user.id, name, description || "", JSON.stringify(rules));
    const segment = db.prepare("SELECT * FROM marketing_segments WHERE id = ?").get(id);
    return NextResponse.json(segment, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
