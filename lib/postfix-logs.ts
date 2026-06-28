// ── Types ────────────────────────────────────────────────

export type PostfixMailEvent = {
  /** ISO date string (YYYY-MM-DD) */
  day: string;
  /** Direction: sent (outbound to external) or received (inbound to local mailbox) */
  direction: "sent" | "received";
  /** Sender email address */
  from: string;
  /** Recipient email address */
  to: string;
  /** Message size in bytes (0 if unknown) */
  size: number;
};

export type PostfixLogSummary = {
  /** Total sent emails in range */
  sent: number;
  /** Total received emails in range */
  received: number;
  /** Total bytes sent */
  sentSize: number;
  /** Total bytes received */
  receivedSize: number;
  /** Daily breakdown */
  daily: {
    day: string;
    sent: number;
    received: number;
    sentSize: number;
    receivedSize: number;
  }[];
};

// ── Configuration ────────────────────────────────────────

/**
 * Directory where Docker container logs are stored.
 * Mounted from the host's /var/lib/docker/containers via docker-compose.prod.yml.
 */
function getDockerContainersDir() {
  return process.env.DOCKER_CONTAINERS_DIR ?? "/var/lib/docker/containers";
}

/**
 * Cache for the resolved Postfix log file path.
 */
let _resolvedLogPath: string | null = null;

/**
 * Find the Postfix container's Docker JSON log file by scanning
 * the mounted /var/lib/docker/containers directory.
 *
 * We look for any container whose log file contains "postfix" in its content
 * (specifically the supervisor startup messages that all Postfix containers have).
 *
 * The result is cached after the first successful lookup.
 */
async function resolvePostfixLogPath(): Promise<string | null> {
  if (_resolvedLogPath) return _resolvedLogPath;

  const { access, readFile, readdir } = await import("node:fs/promises");
  const dockerContainersDir = getDockerContainersDir();

  async function exists(filePath: string) {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  if (!(await exists(dockerContainersDir))) {
    console.warn(
      `[postfix-logs] Docker containers dir not found: ${dockerContainersDir}. ` +
        "Stats will show 0 for sent/received. " +
        "Ensure the Docker container logs directory is mounted in docker-compose.prod.yml.",
    );
    return null;
  }

  try {
    const entries = await readdir(dockerContainersDir, { withFileTypes: true });

    // Prefer Docker metadata over log content. Several mailcow containers mention
    // "postfix" in their logs, but only the real container has this name.
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const containerDir = `${dockerContainersDir}/${entry.name}`;
      const logFile = `${containerDir}/${entry.name}-json.log`;
      const configFile = `${containerDir}/config.v2.json`;

      if (!(await exists(logFile))) continue;

      if (!(await exists(configFile))) continue;

      try {
        const config = JSON.parse(await readFile(configFile, "utf-8")) as {
          Name?: string;
          Config?: { Image?: string };
        };
        const name = config.Name ?? "";
        const image = config.Config?.Image ?? "";
        const isPostfixContainer =
          /(^|[-_/])postfix-mailcow(-|_|$)/i.test(name) ||
          /(^|[-_/])postfix-mailcow(-|_|$)/i.test(image);

        if (isPostfixContainer && !/tlspol/i.test(name) && !/tlspol/i.test(image)) {
          _resolvedLogPath = logFile;
          console.log(`[postfix-logs] Resolved Postfix log: ${logFile}`);
          return logFile;
        }
      } catch {
        // Fall through to content-based detection below.
      }
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const containerDir = `${dockerContainersDir}/${entry.name}`;
      const logFile = `${containerDir}/${entry.name}-json.log`;

      if (!(await exists(logFile))) continue;

      // Fallback: look for actual Postfix delivery/qmgr log lines, not just the
      // word "postfix", which also appears in watchdog and application logs.
      const sample = await readFile(logFile, { encoding: "utf-8", flag: "r" });
      if (/postfix\/(?:smtp|lmtp|qmgr|smtpd)\[\d+\]:/.test(sample)) {
        _resolvedLogPath = logFile;
        console.log(`[postfix-logs] Resolved Postfix log: ${logFile}`);
        return logFile;
      }
    }

    console.warn(
      `[postfix-logs] No Postfix container log found in ${dockerContainersDir}. ` +
        "Stats will show 0 for sent/received.",
    );
    return null;
  } catch (err) {
    console.error(`[postfix-logs] Error scanning container logs:`, err);
    return null;
  }
}

// ── Regex patterns ───────────────────────────────────────

/**
 * Queue ID extraction: extract the queue ID from any Postfix log line.
 * Used to correlate qmgr size entries with delivery events.
 */
const QUEUE_ID_RE = /postfix\/\w+\[\d+\]:\s+(\S+):/;

/**
 * Sent mail pattern: postfix/smtp delivering to external server.
 *
 * Examples:
 *   With orig_to (alias/forwarding):
 *     postfix/smtp[3582]: 01D9D28D733: to=<nabin@curllabs.com>, orig_to=<9n2nk@qrzmail.com>, relay=..., status=sent (250 ...)
 *   Without orig_to (direct send):
 *     postfix/smtp[3582]: 01D9D28D733: to=<nabin@curllabs.com>, relay=..., status=sent (250 ...)
 *
 * Captures:
 *   [1] queue ID
 *   [2] recipient (to)
 *   [3] sender (orig_to) — optional, may be undefined
 */
const SENT_RE =
  /postfix\/smtp\[\d+\]:\s+(\S+):\s+to=<([^>]+)>(?:,\s+orig_to=<([^>]+)>)??.*?status=sent\s/;

/**
 * Received mail pattern: postfix/lmtp delivering to Dovecot (local mailbox).
 *
 * Example:
 *   postfix/lmtp[30948]: 90A4B28E51A: to=<rita@qrzmail.com>, relay=dovecot[...]:24, ... status=sent (250 2.0.0 <rita@qrzmail.com> ... Saved)
 *
 * Captures:
 *   [1] queue ID
 *   [2] recipient (to)
 */
const RECEIVED_RE =
  /postfix\/lmtp\[\d+\]:\s+(\S+):\s+to=<([^>]+)>.*?Saved/;

/**
 * Size pattern: extract size from qmgr entries.
 *
 * Example:
 *   postfix/qmgr[350]: 7F88428D757: from=<9n2nk@qrzmail.com>, size=917, nrcpt=1 (queue active)
 *
 * Captures:
 *   [1] queue ID
 *   [2] sender (from)
 *   [3] size
 */
const QMGR_SIZE_RE =
  /postfix\/qmgr\[\d+\]:\s+(\S+):\s+from=<([^>]*)>,\s+size=(\d+)/;

// ── Log Parser ───────────────────────────────────────────

/**
 * Parse the Postfix Docker JSON log file and extract mail events
 * within the given date range.
 */
export async function parsePostfixLogs(
  fromDate: Date,
  toDate: Date,
): Promise<PostfixMailEvent[]> {
  const logPath = await resolvePostfixLogPath();
  if (!logPath) {
    console.warn(
      `[postfix-logs] No Postfix log file found. ` +
        "Stats will show 0 for sent/received. " +
        "Ensure the Docker container logs directory is mounted in docker-compose.prod.yml.",
    );
    return [];
  }

  const fromMs = fromDate.getTime();
  const toMs = toDate.getTime();
  const events: PostfixMailEvent[] = [];

  // Map queue ID -> { from, size } from qmgr entries
  const queueSizes = new Map<string, { from: string; size: number }>();

  // Read the file line by line (it's a JSON-lines file)
  const { readFile } = await import("node:fs/promises");
  const content = await readFile(logPath, "utf-8");
  const lines = content.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const parsed = JSON.parse(line);
      const logMsg: string = parsed.log ?? "";
      const logTime: string = parsed.time ?? "";

      // Parse the Docker timestamp to filter by date range
      const eventDate = new Date(logTime);
      if (isNaN(eventDate.getTime())) continue;
      if (eventDate.getTime() < fromMs || eventDate.getTime() >= toMs) continue;

      const day = eventDate.toISOString().slice(0, 10);

      // Collect queue sizes from qmgr entries
      const qmgrMatch = logMsg.match(QMGR_SIZE_RE);
      if (qmgrMatch) {
        const [, queueId, from, sizeStr] = qmgrMatch;
        queueSizes.set(queueId, { from: from || "unknown", size: parseInt(sizeStr, 10) || 0 });
      }

      // Check for sent mail (external delivery via postfix/smtp)
      const sentMatch = logMsg.match(SENT_RE);
      if (sentMatch) {
        const [, queueId, to, origTo] = sentMatch;
        // Use orig_to as sender if available, otherwise look up from qmgr
        let from = origTo ?? "";
        if (!from) {
          const qEntry = queueSizes.get(queueId);
          if (qEntry) from = qEntry.from;
        }
        // Get size from qmgr cache or from the log line
        const qEntry = queueSizes.get(queueId);
        const size = qEntry?.size ?? 0;
        events.push({ day, direction: "sent", from, to, size });
        continue;
      }

      // Check for received mail (local delivery via postfix/lmtp to Dovecot)
      const receivedMatch = logMsg.match(RECEIVED_RE);
      if (receivedMatch) {
        const [, queueId, to] = receivedMatch;
        // Get size from qmgr cache
        const qEntry = queueSizes.get(queueId);
        const size = qEntry?.size ?? 0;
        // For received mail, the "to" is the local recipient
        events.push({ day, direction: "received", from: "", to, size });
        continue;
      }
    } catch {
      // Skip malformed JSON lines
      continue;
    }
  }

  return events;
}

/**
 * Get a summary of sent/received email counts grouped by day
 * for the given date range.
 */
export async function getPostfixLogSummary(
  fromDate: Date,
  toDate: Date,
): Promise<PostfixLogSummary> {
  const events = await parsePostfixLogs(fromDate, toDate);

  // Build daily map
  const dayMap = new Map<
    string,
    { sent: number; received: number; sentSize: number; receivedSize: number }
  >();

  // Fill in all days in range
  const cursor = new Date(fromDate);
  while (cursor < toDate) {
    const key = cursor.toISOString().slice(0, 10);
    dayMap.set(key, { sent: 0, received: 0, sentSize: 0, receivedSize: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const event of events) {
    const entry = dayMap.get(event.day);
    if (!entry) continue;
    if (event.direction === "sent") {
      entry.sent++;
      entry.sentSize += event.size;
    } else {
      entry.received++;
      entry.receivedSize += event.size;
    }
  }

  const daily = Array.from(dayMap.entries()).map(([day, counts]) => ({
    day,
    ...counts,
  }));

  const summary = daily.reduce(
    (acc, d) => ({
      sent: acc.sent + d.sent,
      received: acc.received + d.received,
      sentSize: acc.sentSize + d.sentSize,
      receivedSize: acc.receivedSize + d.receivedSize,
    }),
    { sent: 0, received: 0, sentSize: 0, receivedSize: 0 },
  );

  return { ...summary, daily };
}
