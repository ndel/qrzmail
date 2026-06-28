import { NextRequest, NextResponse } from "next/server";
import { processQueue } from "@/lib/queue";
import { checkBounceReplies } from "@/lib/imap";
import { recordBounce } from "@/lib/tracking";
import db from "@/lib/db";

// Simple in-memory state for the worker endpoint
let lastImapCheck = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "process";

    switch (action) {
      case "process": {
        const batchSize = body.batchSize || 50;
        const result = await processQueue(batchSize);
        return NextResponse.json({ success: true, ...result });
      }
      case "check-bounces": {
        // Get all providers that have sent emails (across all users)
        const providers = db
          .prepare("SELECT DISTINCT p.id FROM marketing_providers p JOIN marketing_queue q ON q.provider_id = p.id WHERE q.sent_at IS NOT NULL")
          .all() as any[];

        const results: any[] = [];
        for (const provider of providers) {
          const replies = await checkBounceReplies(provider.id, new Date(lastImapCheck));
          for (const reply of replies) {
            if (reply.isBounce) {
              const emailMatch = reply.text.match(/<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/);
              const bouncedEmail = emailMatch ? emailMatch[1] : reply.from;
              recordBounce(bouncedEmail, reply.text.slice(0, 500));
              results.push({ email: bouncedEmail, subject: reply.subject });
            }
          }
        }
        lastImapCheck = Date.now();
        return NextResponse.json({ success: true, bounces: results });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
