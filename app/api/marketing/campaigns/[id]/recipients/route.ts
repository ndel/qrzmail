import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const campaign = db.prepare("SELECT id, name FROM marketing_campaigns WHERE id = ? AND owner_id = ?").get(id, user.id) as any;
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const recipients = db.prepare(`
    SELECT
      q.id AS queue_id,
      q.status,
      q.subject,
      q.sent_at,
      q.opened_at,
      q.clicked_at,
      q.error_message,
      q.retry_count,
      c.id AS contact_id,
      c.email,
      c.name AS contact_name,
      c.company AS contact_company
    FROM marketing_queue q
    JOIN marketing_contacts c ON c.id = q.contact_id
    WHERE q.campaign_id = ? AND q.owner_id = ?
    ORDER BY q.created_at ASC
  `).all(id, user.id) as any[];

  const linkStmt = db.prepare(`
    SELECT url, clicked_at, click_count
    FROM marketing_links
    WHERE queue_id = ?
    ORDER BY clicked_at ASC
  `);

  const result = recipients.map((r) => {
    const links = linkStmt.all(r.queue_id) as any[];
    return {
      ...r,
      links: links.filter((l) => l.clicked_at || l.click_count > 0),
    };
  });

  return NextResponse.json({
    campaign: { id: campaign.id, name: campaign.name },
    total: result.length,
    recipients: result,
  });
}
