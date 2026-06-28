import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import db from "./db";

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
}

export function getImapConfig(providerId: string): ImapConfig | null {
  const row = db
    .prepare("SELECT imap_host, imap_port, imap_user, imap_pass, imap_secure FROM marketing_providers WHERE id = ?")
    .get(providerId) as any;
  if (!row) return null;
  return {
    host: row.imap_host,
    port: row.imap_port,
    user: row.imap_user,
    pass: row.imap_pass,
    secure: row.imap_secure === 1,
  };
}

export function createImapClient(config: ImapConfig) {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    logger: false,
  });
}

export async function checkBounceReplies(
  providerId: string,
  sinceDate?: Date
): Promise<Array<{
  from: string; subject: string; messageId: string;
  inReplyTo?: string; references?: string; text: string; isBounce: boolean;
}>> {
  const config = getImapConfig(providerId);
  if (!config) return [];

  const client = createImapClient(config);
  const results: Array<any> = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const searchSince = sinceDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
      for await (const msg of client.fetch({ since: searchSince }, { source: true })) {
        try {
          const source = msg.source;
          if (!source) continue;
          const parsed = await simpleParser(source);
          const from = parsed.from?.text || "";
          const subject = parsed.subject || "";
          const messageId = parsed.messageId || "";
          const inReplyTo = parsed.inReplyTo || undefined;
          const references = parsed.references || undefined;
          const text = parsed.text || "";
          const isBounce =
            /(mail delivery failed|undelivered|returned to sender|permanent error|address rejected|user unknown|mailbox not found|no such user)/i.test(subject + " " + text) ||
            /(5\.1\.1|5\.1\.0|550\s+5\.1\.1|550\s+5\.1\.0)/.test(text);
          results.push({ from, subject, messageId, inReplyTo, references, text, isBounce });
        } catch { /* skip unparseable */ }
      }
    } finally { lock.release(); }
    await client.logout();
  } catch { /* connection issues */ }

  return results;
}
