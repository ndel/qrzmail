import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const isNextProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

function getDbPath() {
  const dbPath =
    process.env.MARKETING_DB_PATH ||
    (process.env.MARKETING_DATA_DIR
      ? path.join(process.env.MARKETING_DATA_DIR, "marketing.db")
      : path.join(process.cwd(), ".data", "marketing.db"));

  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return dbPath;
}

const dbPath = isNextProductionBuild ? ":memory:" : getDbPath();
const db = new Database(dbPath, { timeout: 10000 });

db.pragma("busy_timeout = 10000");
db.pragma("journal_mode = WAL");

// Enable foreign keys
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS marketing_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS marketing_providers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES marketing_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Default',
    smtp_host TEXT NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_user TEXT NOT NULL,
    smtp_pass TEXT NOT NULL,
    smtp_secure INTEGER NOT NULL DEFAULT 1,
    imap_host TEXT NOT NULL,
    imap_port INTEGER NOT NULL DEFAULT 993,
    imap_user TEXT NOT NULL,
    imap_pass TEXT NOT NULL,
    imap_secure INTEGER NOT NULL DEFAULT 1,
    daily_limit INTEGER NOT NULL DEFAULT 300,
    monthly_limit INTEGER NOT NULL DEFAULT 9000,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS marketing_lists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES marketing_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS marketing_contacts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES marketing_users(id) ON DELETE CASCADE,
    list_id TEXT NOT NULL REFERENCES marketing_lists(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    company TEXT,
    phone TEXT,
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
    user_id TEXT NOT NULL REFERENCES marketing_users(id) ON DELETE CASCADE,
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
    user_id TEXT NOT NULL REFERENCES marketing_users(id) ON DELETE CASCADE,
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
    user_id TEXT NOT NULL REFERENCES marketing_users(id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL REFERENCES marketing_campaigns(id),
    contact_id TEXT NOT NULL REFERENCES marketing_contacts(id),
    provider_id TEXT NOT NULL REFERENCES marketing_providers(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed','bounced','opened','clicked','unsubscribed','complained')),
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
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
    user_id TEXT NOT NULL REFERENCES marketing_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    rules TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_marketing_providers_user ON marketing_providers(user_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_lists_user ON marketing_lists(user_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_contacts_user ON marketing_contacts(user_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_templates_user ON marketing_templates(user_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_user ON marketing_campaigns(user_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_queue_user ON marketing_queue(user_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_segments_user ON marketing_segments(user_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_queue_status ON marketing_queue(status);
  CREATE INDEX IF NOT EXISTS idx_marketing_queue_campaign ON marketing_queue(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_queue_tracking ON marketing_queue(tracking_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_contacts_list ON marketing_contacts(list_id);
  CREATE INDEX IF NOT EXISTS idx_marketing_contacts_status ON marketing_contacts(status);
  CREATE INDEX IF NOT EXISTS idx_marketing_links_token ON marketing_links(redirect_token);
  CREATE INDEX IF NOT EXISTS idx_marketing_feedback_email ON marketing_feedback(email);
  CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
`);

export default db;
