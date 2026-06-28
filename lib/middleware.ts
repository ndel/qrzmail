import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import db from "./db";
import {
  generateCsrfToken,
  setCsrfCookie,
  validateCsrf,
} from "./session";

export { generateCsrfToken, setCsrfCookie, validateCsrf } from "./session";

// ── Configuration ──────────────────────────────────────────────────────────

const MAX_BODY_BYTES = 100_000; // 100 KB limit for JSON request bodies
// ── Structured Logger ──────────────────────────────────────────────────────

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  ip?: string;
  userId?: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * Structured logger that writes JSON-formatted log lines to stdout/stderr.
 * In production, these can be ingested by any log aggregator (Datadog, Loki, etc.).
 */
export function log(level: LogLevel, message: string, meta?: Partial<LogEntry>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

/**
 * Creates a request-logging middleware for Next.js.
 * Call this at the start of each API route handler.
 */
export function logRequest(request: NextRequest | Request, startTime?: number): void {
  const ts = startTime ?? Date.now();
  const url = new URL(request.url);
  log("info", "incoming request", {
    method: request.method,
    path: url.pathname,
    ip: getClientIp(request),
  });
}

/**
 * Logs the response for an API route. Call before returning.
 */
export function logResponse(
  request: NextRequest | Request,
  response: NextResponse,
  startTime: number,
): void {
  const durationMs = Date.now() - startTime;
  const url = new URL(request.url);
  const level = response.status >= 500 ? "error" : response.status >= 400 ? "warn" : "info";

  log(level, "request completed", {
    method: request.method,
    path: url.pathname,
    status: response.status,
    durationMs,
    ip: getClientIp(request),
  });
}

function getClientIp(request: NextRequest | Request): string {
  const headers = request.headers;
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || headers.get("x-real-ip") || "unknown";
}

// ── Input Size Limiter ─────────────────────────────────────────────────────

/**
 * Reads the request body as text, enforcing a maximum size limit.
 * Returns `null` if the body exceeds the limit (caller should return 413).
 */
export async function readBodyWithLimit(
  request: Request,
  maxBytes: number = MAX_BODY_BYTES,
): Promise<string | null> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return null;
  }

  const reader = request.body?.getReader();
  if (!reader) {
    // No body — return empty string for routes that expect optional bodies
    return "";
  }

  let totalBytes = 0;
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        // Cancel the reader to free resources
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }

  const concatenated = new Uint8Array(
    chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    concatenated.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(concatenated);
}

/**
 * Wraps `request.json()` with a size limit.
 * Returns `{ ok: true, data: T }` or `{ ok: false, error: Response }`.
 */
export async function parseJsonBody<T>(
  request: Request,
  maxBytes: number = MAX_BODY_BYTES,
): Promise<{ ok: true; data: T } | { ok: false; error: NextResponse }> {
  const bodyText = await readBodyWithLimit(request, maxBytes);

  if (bodyText === null) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: "Request body too large." },
        { status: 413 },
      ),
    };
  }

  if (bodyText.length === 0) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: "Request body is required." },
        { status: 400 },
      ),
    };
  }

  try {
    const data = JSON.parse(bodyText) as T;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      error: NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 },
      ),
    };
  }
}

// ── CSRF Protection ────────────────────────────────────────────────────────

/**
 * Convenience: validates CSRF and returns a 403 response if invalid.
 * Returns `null` if valid (caller should proceed).
 */
export function requireCsrf(request: Request): NextResponse | null {
  if (!validateCsrf(request)) {
    log("warn", "CSRF validation failed", {
      method: request.method,
      path: new URL(request.url).pathname,
      ip: getClientIp(request),
    });
    return NextResponse.json(
      { error: "Invalid or missing CSRF token." },
      { status: 403 },
    );
  }
  return null;
}

// ── Persistent Rate Limiter (SQLite-backed) ────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5; // max attempts per window

/**
 * Checks and increments a persistent rate limit counter in SQLite.
 *
 * Returns the number of seconds to wait before retrying, or `null` if allowed.
 *
 * The rate limit key should be unique per client (e.g., IP address or user ID).
 * The window is aligned to RATE_LIMIT_WINDOW_MS boundaries so restarts don't
 * reset the counter — a new request falls into the same window as before.
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = RATE_LIMIT_MAX,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
): number | null {
  const now = Date.now();
  // Align window to a fixed boundary so restarts don't reset counters
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowEnd = windowStart + windowMs;

  // Lazy-import db to avoid circular dependencies
  // Use UPSERT to atomically increment or insert
  const row = db.prepare(
    `INSERT INTO rate_limits (key, window_start, count)
     VALUES (?, ?, 1)
     ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1
     RETURNING count`,
  ).get(key, windowStart) as { count: number } | undefined;

  const count = row?.count ?? 1;

  if (count > maxAttempts) {
    // Return seconds until window expires
    return Math.ceil((windowEnd - now) / 1000);
  }

  return null;
}

/**
 * Cleans up old rate limit entries to prevent table bloat.
 * Call this periodically or on signup success.
 */
export function cleanRateLimits(): void {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS * 2; // Keep last 2 windows
  const alignedCutoff = Math.floor(cutoff / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;

  db.prepare("DELETE FROM rate_limits WHERE window_start < ?").run(alignedCutoff);
}
