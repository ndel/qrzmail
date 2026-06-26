import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getMailboxQuotas,
  getDailySaslCounts,
  getSaslLogSummary,
} from "@/lib/mailcow-db";
import { getPostfixLogSummary } from "@/lib/postfix-logs";

export const runtime = "nodejs";

/**
 * GET /api/admin/stats?range=today|week|month|custom&from=ISO&to=ISO
 *
 * Superadmin-only endpoint that returns aggregated email send/receive stats
 * grouped by day for the requested time range.
 *
 * Data sources:
 *   1. Postfix Docker container logs — primary source for sent/received email
 *      counts. Parsed from the Docker JSON log file mounted at
 *      /var/lib/docker/containers. Sent = outbound delivery via postfix/smtp
 *      to external servers. Received = inbound delivery via postfix/lmtp to
 *      local Dovecot mailboxes.
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

  // ── 1. Postfix Docker logs (primary sent/received data) ──────────
  // Parse the Postfix container's Docker JSON log file for real mail
  // traffic events. Sent = outbound delivery to external servers via
  // postfix/smtp. Received = inbound delivery to local Dovecot mailboxes
  // via postfix/lmtp.
  const postfixSummary = await getPostfixLogSummary(fromDate, toDate);

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

  // Build daily series from Postfix data, enriched with sasl logins
  const saslDayMap = new Map<string, number>();
  for (const row of saslDaily) {
    saslDayMap.set(row.day, row.count);
  }

  const daily = postfixSummary.daily.map((d) => ({
    day: d.day,
    sent: d.sent,
    received: d.received,
    total: d.sent + d.received,
    sentSize: d.sentSize,
    receivedSize: d.receivedSize,
    logins: saslDayMap.get(d.day) ?? 0,
  }));

  const summary = {
    totalSent: postfixSummary.sent,
    totalReceived: postfixSummary.received,
    totalSize: postfixSummary.sentSize + postfixSummary.receivedSize,
    sentSize: postfixSummary.sentSize,
    receivedSize: postfixSummary.receivedSize,
    // Mailcow-wide storage stats (all mailboxes, all time)
    totalStoredMessages: totalStored.messages,
    totalStoredBytes: totalStored.bytes,
    activeMailboxes,
    totalMailboxes,
    // SASL events in this range (user authentication activity)
    totalLogins: saslSummary.total,
  };

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
