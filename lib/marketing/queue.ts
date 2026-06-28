import crypto from "crypto";
import db from "@/lib/db";
import { sendEmail } from "./smtp";
import { generateTrackingId, generateRedirectToken, generateUnsubscribeToken, injectTracking, injectUnsubscribeLink } from "./tracking";

const BASE_URL = process.env.BASE_URL || "https://qrzmail.com";

function resolveVariables(template: string, contact: { name?: string; email: string; company?: string; phone?: string; custom_fields?: string }): string {
  const customFields = JSON.parse(contact.custom_fields || "{}");
  const vars: Record<string, string> = {
    "{{name}}": contact.name || "",
    "{{email}}": contact.email,
    "{{company}}": contact.company || "",
    "{{phone}}": contact.phone || "",
    "{{first_name}}": (contact.name || "").split(" ")[0] || "",
    ...Object.fromEntries(Object.entries(customFields).map(([k, v]) => [`{{${k}}}`, String(v || "")])),
  };
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(key).join(value);
  }
  return result;
}

export function enqueueCampaign(campaignId: string): { enqueued: number; errors: string[] } {
  const campaign = db.prepare("SELECT * FROM marketing_campaigns WHERE id = ?").get(campaignId) as any;
  if (!campaign) return { enqueued: 0, errors: ["Campaign not found"] };

  const template = db.prepare("SELECT * FROM marketing_templates WHERE id = ?").get(campaign.template_id) as any;
  if (!template) return { enqueued: 0, errors: ["Template not found"] };

  const contacts = db.prepare("SELECT * FROM marketing_contacts WHERE list_id = ? AND status = 'active'").all(campaign.list_id) as any[];
  if (contacts.length === 0) return { enqueued: 0, errors: ["No active contacts in list"] };

  const errors: string[] = [];
  let enqueued = 0;

  const insertQueue = db.prepare(
    "INSERT INTO marketing_queue (id, campaign_id, contact_id, provider_id, owner_id, status, subject, html_body, plain_body, tracking_id) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)"
  );
  const insertLink = db.prepare(
    "INSERT INTO marketing_links (id, queue_id, url, redirect_token) VALUES (?, ?, ?, ?)"
  );
  const updateContactToken = db.prepare(
    "UPDATE marketing_contacts SET unsubscribe_token = ? WHERE id = ? AND unsubscribe_token IS NULL"
  );

  const transaction = db.transaction(() => {
    for (const contact of contacts) {
      try {
        const queueId = crypto.randomUUID();
        const trackingId = generateTrackingId();
        let unsubscribeToken = contact.unsubscribe_token;
        if (!unsubscribeToken) {
          unsubscribeToken = generateUnsubscribeToken();
          updateContactToken.run(unsubscribeToken, contact.id);
        }
        const subject = resolveVariables(template.subject, contact);
        let htmlBody = resolveVariables(template.html_content, contact);
        const plainBody = template.plain_content ? resolveVariables(template.plain_content, contact) : undefined;

        const linkRegex = /href="(https?:\/\/[^"]+)"/gi;
        const links: Array<{ id: string; url: string; redirectToken: string }> = [];
        let match;
        const seenUrls = new Set<string>();
        while ((match = linkRegex.exec(htmlBody)) !== null) {
          const url = match[1];
          if (!seenUrls.has(url) && !url.includes("/api/track/") && !url.includes("/api/unsubscribe")) {
            seenUrls.add(url);
            links.push({ id: crypto.randomUUID(), url, redirectToken: generateRedirectToken() });
          }
        }

        htmlBody = injectTracking(htmlBody, trackingId, links);
        const unsubscribeUrl = `${BASE_URL}/marketing/api/unsubscribe?token=${unsubscribeToken}`;
        htmlBody = injectUnsubscribeLink(htmlBody, unsubscribeUrl);

        insertQueue.run(queueId, campaignId, contact.id, campaign.provider_id, campaign.owner_id, subject, htmlBody, plainBody || null, trackingId);
        for (const link of links) {
          insertLink.run(link.id, queueId, link.url, link.redirectToken);
        }
        enqueued++;
      } catch (err: any) {
        errors.push(`Failed to enqueue ${contact.email}: ${err.message}`);
      }
    }
    db.prepare("UPDATE marketing_campaigns SET total_recipients = ?, status = 'scheduled', updated_at = datetime('now') WHERE id = ?").run(enqueued, campaignId);
  });

  transaction();
  return { enqueued, errors };
}

export async function processQueue(batchSize: number = 50): Promise<{ sent: number; failed: number }> {
  const pending = db
    .prepare("SELECT q.* FROM marketing_queue q WHERE q.status = 'pending' LIMIT ?")
    .all(batchSize) as any[];

  let sent = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const provider = db.prepare("SELECT * FROM marketing_providers WHERE id = ?").get(item.provider_id) as any;
      const contact = db.prepare("SELECT * FROM marketing_contacts WHERE id = ?").get(item.contact_id) as any;
      const from = provider?.smtp_user || "noreply@qrzmail.com";
      const toEmail = contact?.email || "unknown@invalid";

      db.prepare("UPDATE marketing_queue SET status = 'sending' WHERE id = ?").run(item.id);
      const result = await sendEmail(item.provider_id, from, toEmail, item.subject, item.html_body, item.plain_body || undefined);

      if (result.success) {
        db.prepare("UPDATE marketing_queue SET status = 'sent', sent_at = datetime('now') WHERE id = ?").run(item.id);
        sent++;
      } else {
        const retryCount = item.retry_count + 1;
        if (retryCount >= item.max_retries) {
          db.prepare("UPDATE marketing_queue SET status = 'failed', error_message = ?, retry_count = ? WHERE id = ?").run(result.error || "Unknown error", retryCount, item.id);
        } else {
          db.prepare("UPDATE marketing_queue SET retry_count = ?, error_message = ? WHERE id = ?").run(retryCount, result.error || "Unknown error", item.id);
        }
        failed++;
      }
    } catch (err: any) {
      db.prepare("UPDATE marketing_queue SET status = 'failed', error_message = ? WHERE id = ?").run(err.message, item.id);
      failed++;
    }
  }

  if (pending.length > 0) {
    const campaignId = pending[0].campaign_id;
    db.prepare(
      `UPDATE marketing_campaigns SET 
        sent_count = (SELECT COUNT(*) FROM marketing_queue WHERE campaign_id = ? AND status = 'sent'),
        status = CASE 
          WHEN (SELECT COUNT(*) FROM marketing_queue WHERE campaign_id = ? AND status IN ('pending','sending')) = 0 THEN 'completed'
          ELSE 'sending'
        END,
        started_at = COALESCE(started_at, datetime('now')),
        completed_at = CASE 
          WHEN (SELECT COUNT(*) FROM marketing_queue WHERE campaign_id = ? AND status IN ('pending','sending')) = 0 THEN datetime('now')
          ELSE NULL
        END,
        updated_at = datetime('now')
      WHERE id = ?`
    ).run(campaignId, campaignId, campaignId, campaignId);
  }

  return { sent, failed };
}
