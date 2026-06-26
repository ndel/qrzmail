import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import db from "@/lib/db";
import {
  getTotalStoredMessages,
  getMailboxQuotas,
  getDailySaslCounts,
  getSaslLogSummary,
} from "@/lib/mailcow-db";

export const runtime = "nodejs";

/**
 * GET /api/admin/stats?range=today|week|month|custom&from=ISO&to=ISO
 *
 * Superadmin-only endpoint that returns aggregated email send/receive stats
 * grouped by day for the requested time range.
 *
 * Data sources:
 *   1. Local email_log table — populated by app-level logging (e.g. when
 *      the QRZMail app sends password-reset emails via nodemailer).
 *   2. Mailcow MySQL quota2 — total messages & bytes stored per mailbox.
 *      This represents cumulative received mail stored on the server.
 *   3. Mailcow MySQL sasl_log — user authentication events (IMAP, SOGO,
 *      webmail logins). Used as a proxy for user activity.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "today";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  // Determine date boundaries
  const now = new Date();
  let fromDate: Date;
  let toDate: Date = new Date(now);

  switch (range) {
    case "today": {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      toDate = new Date(fromDate);
      toDate.setDate(toDate.getDate() + 1);
      break;
    }
    case "week": {
      fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 6);
      fromDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
      toDate = new Date(now);
      toDate.setDate(toDate.getDate() + 1);
      toDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
      break;
    }
    case "month": {
      fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 29);
      fromDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
      toDate = new Date(now);
      toDate.setDate(toDate.getDate() + 1);
      toDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
      break;
    }
    case "custom": {
      if (!fromParam || !toParam) {
        return NextResponse.json(
          { error: "Custom range requires 'from' and 'to' ISO date parameters." },
          { status: 400 },
        );
      }
      fromDate = new Date(fromParam);
      toDate = new Date(toParam);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format. Use ISO 8601." },
          { status: 400 },
        );
      }
      break;
    }
    default: {
      return NextResponse.json(
        { error: `Unknown range: ${range}. Use today, week, month, or custom.` },
        { status: 400 },
      );
    }
  }

  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  // ── 1. Local email_log table ─────────────────────────────────────
  // This is populated when the QRZMail app itself sends emails
  // (e.g. password reset emails via nodemailer).
  const localRows = db
    .prepare(
      `
      SELECT
        date(created_at) AS day,
        direction,
        COUNT(*) AS count,
        COALESCE(SUM(size), 0) AS total_size
      FROM email_log
      WHERE created_at >= ? AND created_at < ?
      GROUP BY date(created_at), direction
      ORDER BY day ASC
      `,
    )
    .all(fromIso, toIso) as {
    day: string;
    direction: "sent" | "received";
    count: number;
    total_size: number;
  }[];

  // ── 2. Mailcow MySQL quota2 (total stored messages per mailbox) ──
  const mailboxQuotas = await getMailboxQuotas();
  const totalStored = mailboxQuotas.reduce(
    (acc, q) => ({
      messages: acc.messages + q.messages,
      bytes: acc.bytes + q.bytes,
    }),
    { messages: 0, bytes: 0 },
  );

  // Count mailboxes that have at least one message
  const activeMailboxes = mailboxQuotas.filter((q) => q.messages > 0).length;
  const totalMailboxes = mailboxQuotas.length;

  // ── 3. Mailcow MySQL sasl_log (daily auth events) ────────────────
  const saslDaily = await getDailySaslCounts(fromIso, toIso);
  const saslSummary = await getSaslLogSummary(fromIso, toIso);

  // Build a map: day -> { sent, received, total, sentSize, receivedSize }
  const dayMap = new Map<
    string,
    { sent: number; received: number; total: number; sentSize: number; receivedSize: number }
  >();

  // Fill in all days in range so there are no gaps
  const cursor = new Date(fromDate);
  while (cursor < toDate) {
    const key = cursor.toISOString().slice(0, 10);
    dayMap.set(key, { sent: 0, received: 0, total: 0, sentSize: 0, receivedSize: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Merge local email_log data
  for (const row of localRows) {
    const entry = dayMap.get(row.day);
    if (entry) {
      if (row.direction === "sent") {
        entry.sent = row.count;
        entry.sentSize = row.total_size;
      } else {
        entry.received = row.count;
        entry.receivedSize = row.total_size;
      }
      entry.total = entry.sent + entry.received;
    }
  }

  // Merge Mailcow sasl_log data as a secondary "activity" metric
  // (shown separately in the UI, not mixed with email_log counts)
  const saslDayMap = new Map<string, number>();
  for (const row of saslDaily) {
    saslDayMap.set(row.day, row.count);
  }

  // Build daily series
  const daily = Array.from(dayMap.entries()).map(([day, counts]) => ({
    day,
    ...counts,
    // Include sasl events separately (user logins, not email sends)
    logins: saslDayMap.get(day) ?? 0,
  }));

  // ── Totals from local email_log ──────────────────────────────────
  const localTotals = db
    .prepare(
      `
      SELECT
        direction,
        COUNT(*) AS count,
        COALESCE(SUM(size), 0) AS total_size
      FROM email_log
      WHERE created_at >= ? AND created_at < ?
      GROUP BY direction
      `,
    )
    .all(fromIso, toIso) as {
    direction: "sent" | "received";
    count: number;
    total_size: number;
  }[];

  const summary = {
    totalSent: 0,
    totalReceived: 0,
    totalSize: 0,
    sentSize: 0,
    receivedSize: 0,
    // Mailcow-wide storage stats (all mailboxes, all time)
    totalStoredMessages: totalStored.messages,
    totalStoredBytes: totalStored.bytes,
    activeMailboxes,
    totalMailboxes,
    // SASL events in this range (user authentication activity)
    totalLogins: saslSummary.total,
  };

  for (const row of localTotals) {
    if (row.direction === "sent") {
      summary.totalSent = row.count;
      summary.sentSize = row.total_size;
    } else {
      summary.totalReceived = row.count;
      summary.receivedSize = row.total_size;
    }
  }
  summary.totalSize = summary.sentSize + summary.receivedSize;

  return NextResponse.json({
    range,
    from: fromIso,
    to: toIso,
    summary,
    daily,
    // Per-mailbox breakdown (for reference)
    mailboxes: mailboxQuotas.map((q) => ({
      email: q.username,
      storedMessages: q.messages,
      storedBytes: q.bytes,
    })),
  });
}
