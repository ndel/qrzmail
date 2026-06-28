import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { enqueueCampaign } from "@/lib/marketing/queue";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaigns = db.prepare(`
    SELECT c.*, p.name as provider_name, t.name as template_name, l.name as list_name
    FROM marketing_campaigns c
    LEFT JOIN marketing_providers p ON p.id = c.provider_id AND p.owner_id = ?
    LEFT JOIN marketing_templates t ON t.id = c.template_id AND t.owner_id = ?
    LEFT JOIN marketing_lists l ON l.id = c.list_id AND l.owner_id = ?
    WHERE c.owner_id = ?
    ORDER BY c.created_at DESC
  `).all(user.id, user.id, user.id, user.id);
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const id = crypto.randomUUID();
    const { name, provider_id, template_id, list_id, scheduled_at } = body;
    if (!name || !provider_id || !template_id || !list_id) {
      return NextResponse.json({ error: "name, provider_id, template_id, and list_id are required" }, { status: 400 });
    }

    db.prepare(`
      INSERT INTO marketing_campaigns (id, owner_id, name, provider_id, template_id, list_id, status, scheduled_at)
      VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)
    `).run(id, user.id, name, provider_id, template_id, list_id, scheduled_at || null);

    const campaign = db.prepare("SELECT * FROM marketing_campaigns WHERE id = ?").get(id);
    return NextResponse.json(campaign, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { id, action } = body;
    if (!id || !action) return NextResponse.json({ error: "id and action are required" }, { status: 400 });

    const campaign = db.prepare("SELECT * FROM marketing_campaigns WHERE id = ? AND owner_id = ?").get(id, user.id) as any;
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    switch (action) {
      case "send": {
        const result = enqueueCampaign(id);
        return NextResponse.json({ success: true, enqueued: result.enqueued, errors: result.errors });
      }
      case "pause": {
        db.prepare("UPDATE marketing_campaigns SET status = 'paused', updated_at = datetime('now') WHERE id = ? AND owner_id = ?").run(id, user.id);
        break;
      }
      case "resume": {
        db.prepare("UPDATE marketing_campaigns SET status = 'sending', updated_at = datetime('now') WHERE id = ? AND owner_id = ?").run(id, user.id);
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const updated = db.prepare("SELECT * FROM marketing_campaigns WHERE id = ? AND owner_id = ?").get(id, user.id);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
