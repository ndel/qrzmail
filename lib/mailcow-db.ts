import mysql, { RowDataPacket, FieldPacket } from "mysql2/promise";

export interface MailcowQuota {
  username: string;
  bytes: number;
  messages: number;
}

export interface SaslLogEntry {
  service: string;
  username: string;
  datetime: string;
}

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MAILCOW_DB_HOST || "mysql-mailcow",
      port: parseInt(process.env.MAILCOW_DB_PORT || "3306", 10),
      user: process.env.MAILCOW_DB_USER || "mailcow",
      password: process.env.MAILCOW_DB_PASS || "",
      database: process.env.MAILCOW_DB_NAME || "mailcow",
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return pool;
}

/**
 * Get total messages per mailbox from the quota2 table.
 * This represents cumulative received messages stored in each mailbox.
 */
export async function getMailboxQuotas(): Promise<MailcowQuota[]> {
  try {
    const conn = getPool();
    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT username, bytes, messages FROM quota2 ORDER BY username ASC",
    );
    return rows as MailcowQuota[];
  } catch (err) {
    console.error("mailcow-db: Failed to query quota2:", err);
    return [];
  }
}

/**
 * Get total messages per mailbox for a specific domain.
 */
export async function getDomainMailboxQuotas(domain: string): Promise<MailcowQuota[]> {
  try {
    const conn = getPool();
    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT username, bytes, messages FROM quota2 WHERE username LIKE ? ORDER BY username ASC",
      [`%@${domain}`],
    );
    return rows as MailcowQuota[];
  } catch (err) {
    console.error("mailcow-db: Failed to query domain quota2:", err);
    return [];
  }
}

/**
 * Get SASL authentication events grouped by day and username.
 * SASL log tracks when users authenticate (IMAP, POP3, SMTP submission, SOGO, etc.)
 * This serves as a proxy for user activity / sent mail volume.
 */
export async function getSaslLogDaily(
  fromDate: string,
  toDate: string,
): Promise<{ day: string; username: string; count: number }[]> {
  try {
    const conn = getPool();
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT
        DATE(datetime) AS day,
        username,
        COUNT(*) AS count
      FROM sasl_log
      WHERE datetime >= ? AND datetime < ?
        AND service NOT IN ('NONE', 'doveadm')
      GROUP BY DATE(datetime), username
      ORDER BY day ASC`,
      [fromDate, toDate],
    );
    return rows as { day: string; username: string; count: number }[];
  } catch (err) {
    console.error("mailcow-db: Failed to query sasl_log:", err);
    return [];
  }
}

/**
 * Get total SASL events in a date range (proxy for total sent mail).
 */
export async function getSaslLogSummary(
  fromDate: string,
  toDate: string,
): Promise<{ total: number }> {
  try {
    const conn = getPool();
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
      FROM sasl_log
      WHERE datetime >= ? AND datetime < ?
        AND service NOT IN ('NONE', 'doveadm')`,
      [fromDate, toDate],
    );
    return { total: rows[0]?.total ?? 0 };
  } catch (err) {
    console.error("mailcow-db: Failed to query sasl_log summary:", err);
    return { total: 0 };
  }
}

/**
 * Get total messages stored across all mailboxes (from quota2).
 * This represents total received mail stored.
 */
export async function getTotalStoredMessages(): Promise<{
  totalMessages: number;
  totalBytes: number;
}> {
  try {
    const conn = getPool();
    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT COALESCE(SUM(messages), 0) AS totalMessages, COALESCE(SUM(bytes), 0) AS totalBytes FROM quota2",
    );
    return {
      totalMessages: rows[0]?.totalMessages ?? 0,
      totalBytes: rows[0]?.totalBytes ?? 0,
    };
  } catch (err) {
    console.error("mailcow-db: Failed to query quota2 totals:", err);
    return { totalMessages: 0, totalBytes: 0 };
  }
}

/**
 * Get daily SASL events aggregated across all users (proxy for daily sent mail volume).
 */
export async function getDailySaslCounts(
  fromDate: string,
  toDate: string,
): Promise<{ day: string; count: number }[]> {
  try {
    const conn = getPool();
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT
        DATE(datetime) AS day,
        COUNT(*) AS count
      FROM sasl_log
      WHERE datetime >= ? AND datetime < ?
        AND service NOT IN ('NONE', 'doveadm')
      GROUP BY DATE(datetime)
      ORDER BY day ASC`,
      [fromDate, toDate],
    );
    return rows as { day: string; count: number }[];
  } catch (err) {
    console.error("mailcow-db: Failed to query daily sasl counts:", err);
    return [];
  }
}

/**
 * Close the connection pool (for cleanup).
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
