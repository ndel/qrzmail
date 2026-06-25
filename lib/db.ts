import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// In production (Docker), QRZMAIL_DATA_DIR is set to /data.
// For local dev, fallback to .data in the project root.
const dataDir = process.env.QRZMAIL_DATA_DIR || path.join(process.cwd(), ".data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "qrzmail.db");
const db = new Database(dbPath);

// Enable Write-Ahead Logging for better performance and concurrency
db.pragma("journal_mode = WAL");

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS user_recovery (
    email TEXT PRIMARY KEY,
    recovery_email TEXT,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer))
  );

  CREATE TABLE IF NOT EXISTS recovery_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    used BOOLEAN DEFAULT 0,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)),
    FOREIGN KEY(email) REFERENCES user_recovery(email) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used BOOLEAN DEFAULT 0,
    created_at INTEGER DEFAULT (cast(strftime('%s', 'now') as integer)),
    FOREIGN KEY(email) REFERENCES user_recovery(email) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner','admin','superadmin')),
    subscription TEXT NOT NULL DEFAULT 'free' CHECK(subscription IN ('free','paid','pending')),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending_dns' CHECK(status IN ('pending_dns','verified','active')),
    verification_token TEXT NOT NULL,
    created_at TEXT NOT NULL,
    verified_at TEXT,
    dkim_selector TEXT,
    dkim_public_key TEXT,
    dkim_private_key TEXT,
    dkim_status TEXT CHECK(dkim_status IN ('pending_dns','active'))
  );

  CREATE TABLE IF NOT EXISTS mailboxes (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    quota_mb INTEGER NOT NULL DEFAULT 1024,
    recovery_email TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS aliases (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    mailcow_id TEXT NOT NULL,
    address TEXT NOT NULL UNIQUE,
    goto TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT NOT NULL,
    window_start INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (key, window_start)
  );

  CREATE INDEX IF NOT EXISTS idx_recovery_codes_email ON recovery_codes(email);
  CREATE INDEX IF NOT EXISTS idx_reset_tokens_email ON reset_tokens(email);
  CREATE INDEX IF NOT EXISTS idx_domains_owner_id ON domains(owner_id);
  CREATE INDEX IF NOT EXISTS idx_mailboxes_domain_id ON mailboxes(domain_id);
  CREATE INDEX IF NOT EXISTS idx_mailboxes_owner_id ON mailboxes(owner_id);
  CREATE INDEX IF NOT EXISTS idx_aliases_domain_id ON aliases(domain_id);
`);

export default db;
