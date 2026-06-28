import crypto from "crypto";
import db from "@/lib/db";

const BASE_URL = process.env.BASE_URL || "https://qrzmail.com";
const MARKETING_BASE = `${BASE_URL}/marketing`;

export function generateTrackingId(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function generateRedirectToken(): string {
  return crypto.randomBytes(12).toString("hex");
}

export function generateUnsubscribeToken(): string {
  return crypto.randomBytes(20).toString("hex");
}

export function injectTracking(
  html: string,
  trackingId: string,
  links: Array<{ id: string; url: string; redirectToken: string }>,
): string {
  const pixelUrl = `${MARKETING_BASE}/api/track/open?tid=${trackingId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;" />`;
  let result = html;
  if (result.includes("</body>")) {
    result = result.replace("</body>", `${pixel}\n</body>`);
  } else {
    result += pixel;
  }
  for (const link of links) {
    const redirectUrl = `${MARKETING_BASE}/api/track/click?rid=${link.redirectToken}`;
    const escapedUrl = link.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const hrefRegex = new RegExp(`href=["']${escapedUrl}["']`, "gi");
    result = result.replace(hrefRegex, `href="${redirectUrl}"`);
  }
  return result;
}

export function injectUnsubscribeLink(html: string, unsubscribeUrl: string): string {
  const link = `<br/><br/><small style="color:#999;">If you no longer wish to receive these emails, <a href="${unsubscribeUrl}">unsubscribe here</a>.</small>`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${link}\n</body>`);
  }
  return html + link;
}

export function recordOpen(trackingId: string): void {
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE marketing_queue SET status = 'opened', opened_at = COALESCE(opened_at, ?) WHERE tracking_id = ? AND opened_at IS NULL"
  ).run(now, trackingId);
  const row = db.prepare("SELECT campaign_id FROM marketing_queue WHERE tracking_id = ?").get(trackingId) as any;
  if (row) {
    db.prepare(
      "UPDATE marketing_campaigns SET open_count = (SELECT COUNT(*) FROM marketing_queue WHERE campaign_id = ? AND opened_at IS NOT NULL) WHERE id = ?"
    ).run(row.campaign_id, row.campaign_id);
  }
}

export function recordClick(redirectToken: string): { url: string } | null {
  const now = new Date().toISOString();
  const link = db.prepare("SELECT id, queue_id, url FROM marketing_links WHERE redirect_token = ?").get(redirectToken) as any;
  if (!link) return null;
  db.prepare("UPDATE marketing_links SET clicked_at = COALESCE(clicked_at, ?), click_count = click_count + 1 WHERE id = ?").run(now, link.id);
  db.prepare("UPDATE marketing_queue SET status = 'clicked', clicked_at = COALESCE(clicked_at, ?) WHERE id = ? AND clicked_at IS NULL").run(now, link.queue_id);
  const row = db.prepare("SELECT campaign_id FROM marketing_queue WHERE id = ?").get(link.queue_id) as any;
  if (row) {
    db.prepare(
      "UPDATE marketing_campaigns SET click_count = (SELECT COUNT(*) FROM marketing_queue WHERE campaign_id = ? AND clicked_at IS NOT NULL) WHERE id = ?"
    ).run(row.campaign_id, row.campaign_id);
  }
  return { url: link.url };
}

export function processUnsubscribe(token: string): boolean {
  const contact = db.prepare("SELECT id, list_id FROM marketing_contacts WHERE unsubscribe_token = ?").get(token) as any;
  if (!contact) return false;
  const now = new Date().toISOString();
  db.prepare("UPDATE marketing_contacts SET status = 'unsubscribed', updated_at = ? WHERE id = ?").run(now, contact.id);
  db.prepare("UPDATE marketing_queue SET status = 'unsubscribed' WHERE contact_id = ? AND status IN ('sent','opened','clicked')").run(contact.id);
  db.prepare(
    `UPDATE marketing_campaigns SET
      unsubscribe_count = (SELECT COUNT(*) FROM marketing_queue WHERE campaign_id = marketing_campaigns.id AND status = 'unsubscribed')
    WHERE id IN (SELECT DISTINCT campaign_id FROM marketing_queue WHERE contact_id = ?)`
  ).run(contact.id);
  return true;
}

export function recordBounce(email: string, reason?: string): void {
  const now = new Date().toISOString();
  const contacts = db.prepare("SELECT id FROM marketing_contacts WHERE email = ? AND status = 'active'").all(email) as any[];
  for (const contact of contacts) {
    db.prepare("UPDATE marketing_contacts SET status = 'bounced', bounced_at = ?, updated_at = ? WHERE id = ?").run(now, now, contact.id);
    db.prepare("UPDATE marketing_queue SET status = 'bounced' WHERE contact_id = ? AND status IN ('sent','opened','clicked')").run(contact.id);
    db.prepare(
      `UPDATE marketing_campaigns SET
        bounce_count = (SELECT COUNT(*) FROM marketing_queue WHERE campaign_id = marketing_campaigns.id AND status = 'bounced')
      WHERE id IN (SELECT DISTINCT campaign_id FROM marketing_queue WHERE contact_id = ?)`
    ).run(contact.id);
  }
}
