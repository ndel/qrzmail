import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();

  const totalCampaigns = (db.prepare("SELECT COUNT(*) as count FROM marketing_campaigns WHERE user_id = ?").get(user.id) as any).count;
  const sentCampaigns = (db.prepare("SELECT COUNT(*) as count FROM marketing_campaigns WHERE user_id = ? AND status = 'completed'").get(user.id) as any).count;
  const totalContacts = (db.prepare("SELECT COUNT(*) as count FROM marketing_contacts WHERE user_id = ?").get(user.id) as any).count;
  const activeContacts = (db.prepare("SELECT COUNT(*) as count FROM marketing_contacts WHERE user_id = ? AND status = 'active'").get(user.id) as any).count;
  const totalSent = (db.prepare("SELECT COUNT(*) as count FROM marketing_queue WHERE user_id = ? AND status = 'sent'").get(user.id) as any).count;
  const totalOpens = (db.prepare("SELECT COUNT(*) as count FROM marketing_queue WHERE user_id = ? AND opened_at IS NOT NULL").get(user.id) as any).count;
  const totalClicks = (db.prepare("SELECT COUNT(*) as count FROM marketing_queue WHERE user_id = ? AND clicked_at IS NOT NULL").get(user.id) as any).count;
  const totalBounces = (db.prepare("SELECT COUNT(*) as count FROM marketing_contacts WHERE user_id = ? AND status = 'bounced'").get(user.id) as any).count;
  const totalUnsubscribes = (db.prepare("SELECT COUNT(*) as count FROM marketing_contacts WHERE user_id = ? AND status = 'unsubscribed'").get(user.id) as any).count;
  const pendingQueue = (db.prepare("SELECT COUNT(*) as count FROM marketing_queue WHERE user_id = ? AND status = 'pending'").get(user.id) as any).count;
  const totalLists = (db.prepare("SELECT COUNT(*) as count FROM marketing_lists WHERE user_id = ?").get(user.id) as any).count;
  const totalProviders = (db.prepare("SELECT COUNT(*) as count FROM marketing_providers WHERE user_id = ?").get(user.id) as any).count;

  // Recent campaigns
  const recentCampaigns = db.prepare(`
    SELECT c.*, l.name as list_name
    FROM marketing_campaigns c
    LEFT JOIN marketing_lists l ON l.id = c.list_id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC LIMIT 5
  `).all(user.id);

  return NextResponse.json({
    totalCampaigns,
    sentCampaigns,
    totalContacts,
    activeContacts,
    totalSent,
    totalOpens,
    totalClicks,
    totalBounces,
    totalUnsubscribes,
    pendingQueue,
    totalLists,
    totalProviders,
    recentCampaigns,
  });
}
