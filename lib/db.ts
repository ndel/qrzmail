import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const isNextProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

function getDbPath() {
  const dbPath =
    process.env.QRZMAIL_DB_PATH ||
    (process.env.QRZMAIL_DATA_DIR
      ? path.join(process.env.QRZMAIL_DATA_DIR, "qrzmail.db")
      : path.join(process.cwd(), ".data", "qrzmail.db"));

  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return dbPath;
}

const dbPath = isNextProductionBuild ? ":memory:" : getDbPath();
const db = new Database(dbPath, { timeout: 10000 });

// Enable Write-Ahead Logging for better performance and concurrency
db.pragma("busy_timeout = 10000");
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

  CREATE TABLE IF NOT EXISTS email_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    direction TEXT NOT NULL CHECK(direction IN ('sent','received')),
    mailbox_id TEXT NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT,
    size INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'delivered' CHECK(status IN ('delivered','failed','bounced')),
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_recovery_codes_email ON recovery_codes(email);
  CREATE INDEX IF NOT EXISTS idx_reset_tokens_email ON reset_tokens(email);
  CREATE INDEX IF NOT EXISTS idx_domains_owner_id ON domains(owner_id);
  CREATE INDEX IF NOT EXISTS idx_mailboxes_domain_id ON mailboxes(domain_id);
  CREATE INDEX IF NOT EXISTS idx_mailboxes_owner_id ON mailboxes(owner_id);
  CREATE INDEX IF NOT EXISTS idx_aliases_domain_id ON aliases(domain_id);
  CREATE INDEX IF NOT EXISTS idx_email_log_created_at ON email_log(created_at);
  CREATE INDEX IF NOT EXISTS idx_email_log_direction ON email_log(direction);
  CREATE INDEX IF NOT EXISTS idx_email_log_mailbox_id ON email_log(mailbox_id);

  -- Marketing / Campaign Tables
  CREATE TABLE IF NOT EXISTS marketing_providers (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Default',
    smtp_host TEXT NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_user TEXT NOT NULL,
    smtp_pass TEXT NOT NULL,
    smtp_secure INTEGER NOT NULL DEFAULT 1,
    imap_host TEXT NOT NULL DEFAULT '',
    imap_port INTEGER NOT NULL DEFAULT 993,
    imap_user TEXT NOT NULL DEFAULT '',
    imap_pass TEXT NOT NULL DEFAULT '',
    imap_secure INTEGER NOT NULL DEFAULT 1,
    daily_limit INTEGER NOT NULL DEFAULT 300,
    monthly_limit INTEGER NOT NULL DEFAULT 9000,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS marketing_lists (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS marketing_contacts (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    list_id TEXT NOT NULL REFERENCES marketing_lists(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT DEFAULT '',
    company TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    custom_fields TEXT DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','unsubscribed','bounced','complained')),
    unsubscribe_token TEXT,
    bounced_at TEXT,
    complained_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(list_id, email)
  );

  CREATE TABLE IF NOT EXISTS marketing_templates (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    plain_content TEXT,
    variables TEXT DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    provider_id TEXT NOT NULL REFERENCES marketing_providers(id),
    template_id TEXT NOT NULL REFERENCES marketing_templates(id),
    list_id TEXT NOT NULL REFERENCES marketing_lists(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','sending','paused','completed','failed')),
    scheduled_at TEXT,
    started_at TEXT,
    completed_at TEXT,
    total_recipients INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    open_count INTEGER NOT NULL DEFAULT 0,
    click_count INTEGER NOT NULL DEFAULT 0,
    bounce_count INTEGER NOT NULL DEFAULT 0,
    unsubscribe_count INTEGER NOT NULL DEFAULT 0,
    complaint_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS marketing_queue (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL REFERENCES marketing_campaigns(id),
    contact_id TEXT NOT NULL REFERENCES marketing_contacts(id),
    provider_id TEXT NOT NULL REFERENCES marketing_providers(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed','bounced','opened','clicked','unsubscribed','complained')),
    subject TEXT NOT NULL DEFAULT '',
    html_body TEXT NOT NULL DEFAULT '',
    plain_body TEXT,
    tracking_id TEXT UNIQUE,
    sent_at TEXT,
    opened_at TEXT,
    clicked_at TEXT,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS marketing_links (
    id TEXT PRIMARY KEY,
    queue_id TEXT NOT NULL REFERENCES marketing_queue(id),
    url TEXT NOT NULL,
    redirect_token TEXT NOT NULL UNIQUE,
    clicked_at TEXT,
    click_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS marketing_feedback (
    id TEXT PRIMARY KEY,
    queue_id TEXT REFERENCES marketing_queue(id),
    email TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('bounce','complaint','unsubscribe')),
    reason TEXT,
    source_message_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS marketing_segments (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    rules TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_marketing_providers_owner ON marketing_providers(owner_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_lists_owner ON marketing_lists(owner_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_contacts_owner ON marketing_contacts(owner_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_contacts_list ON marketing_contacts(list_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_contacts_status ON marketing_contacts(status);
  CREATE INDEX IF NOT EXISTS idx_marketing_templates_owner ON marketing_templates(owner_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_owner ON marketing_campaigns(owner_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
  CREATE INDEX IF NOT EXISTS idx_marketing_queue_owner ON marketing_queue(owner_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_queue_campaign ON marketing_queue(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_queue_status ON marketing_queue(status);
  CREATE INDEX IF NOT EXISTS idx_marketing_queue_tracking ON marketing_queue(tracking_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_links_token ON marketing_links(redirect_token);
  CREATE INDEX IF NOT EXISTS idx_marketing_feedback_email ON marketing_feedback(email);
  CREATE INDEX IF NOT EXISTS idx_marketing_segments_owner ON marketing_segments(owner_id);
`);

export default db;
