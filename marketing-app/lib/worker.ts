import db from "./db";
import { processQueue } from "./queue";
import { checkBounceReplies } from "./imap";
import { recordBounce } from "./tracking";

const POLL_INTERVAL_MS = parseInt(process.env.MARKETING_POLL_INTERVAL || "10000");
const BATCH_SIZE = parseInt(process.env.MARKETING_BATCH_SIZE || "50");
const IMAP_CHECK_INTERVAL_MS = parseInt(process.env.MARKETING_IMAP_INTERVAL || "60000");

let running = false;
let lastImapCheck: Date = new Date(0);

async function processPendingEmails(): Promise<void> {
  try {
    const result = await processQueue(BATCH_SIZE);
    if (result.sent > 0 || result.failed > 0) {
      console.log(`[Marketing Worker] Sent: ${result.sent}, Failed: ${result.failed}`);
    }
  } catch (err: any) {
    console.error("[Marketing Worker] Queue processing error:", err.message);
  }
}

async function checkForBounces(): Promise<void> {
  try {
    const providers = db
      .prepare("SELECT DISTINCT p.id FROM marketing_providers p JOIN marketing_queue q ON q.provider_id = p.id WHERE q.sent_at IS NOT NULL")
      .all() as any[];

    for (const provider of providers) {
      try {
        const replies = await checkBounceReplies(provider.id, lastImapCheck);
        for (const reply of replies) {
          if (reply.isBounce) {
            const emailMatch = reply.text.match(/<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/);
            const bouncedEmail = emailMatch ? emailMatch[1] : reply.from;
            console.log(`[Marketing Worker] Bounce detected: ${bouncedEmail} - ${reply.subject}`);
            recordBounce(bouncedEmail, reply.text.slice(0, 500));
          }
        }
      } catch (err: any) {
        console.error(`[Marketing Worker] IMAP check error for ${provider.id}:`, err.message);
      }
    }
    lastImapCheck = new Date();
  } catch (err: any) {
    console.error("[Marketing Worker] Bounce check error:", err.message);
  }
}

async function tick(): Promise<void> {
  if (!running) return;
  try {
    await processPendingEmails();
    const now = Date.now();
    if (now - lastImapCheck.getTime() >= IMAP_CHECK_INTERVAL_MS) {
      await checkForBounces();
    }
  } catch (err: any) {
    console.error("[Marketing Worker] Tick error:", err.message);
  }
  if (running) setTimeout(tick, POLL_INTERVAL_MS);
}

export function start(): void {
  if (running) {
    console.log("[Marketing Worker] Already running");
    return;
  }
  running = true;
  console.log(`[Marketing Worker] Started (poll: ${POLL_INTERVAL_MS}ms, batch: ${BATCH_SIZE}, imap: ${IMAP_CHECK_INTERVAL_MS}ms)`);
  tick();
}

export function stop(): void {
  running = false;
  console.log("[Marketing Worker] Stopped");
}
