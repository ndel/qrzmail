import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import db from "./db";

// ---------------------------------------------------------------------------
// Types (unchanged — keep in sync with JSON schema)
// ---------------------------------------------------------------------------

export type UserRole = "owner" | "admin" | "superadmin";

export type SubscriptionTier = "free" | "paid" | "pending";

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  subscription: SubscriptionTier;
  createdAt: string;
};

export type DomainStatus = "pending_dns" | "verified" | "active";

export type DomainRecord = {
  id: string;
  ownerId: string;
  domain: string;
  status: DomainStatus;
  verificationToken: string;
  createdAt: string;
  verifiedAt?: string;
  dkim?: {
    selector: string;
    publicKey: string;
    privateKey: string;
    status: "pending_dns" | "active";
  };
};

export type MailboxRecord = {
  id: string;
  ownerId: string;
  domainId: string;
  email: string;
  name: string;
  quotaMb: number;
  recoveryEmail?: string;
  createdAt: string;
};

export type AliasRecord = {
  id: string;
  ownerId: string;
  domainId: string;
  mailcowId: string;
  address: string;
  goto: string;
  active: boolean;
  createdAt: string;
};

type Data = {
  users: User[];
  domains: DomainRecord[];
  mailboxes: MailboxRecord[];
  aliases: AliasRecord[];
};

// ---------------------------------------------------------------------------
// Prepared statements (compiled once at module load)
// ---------------------------------------------------------------------------

// --- users ---
const stmtSelectUsers = db.prepare("SELECT * FROM users ORDER BY created_at");
const stmtInsertUser = db.prepare(
  "INSERT OR IGNORE INTO users (id, email, name, password_hash, role, subscription, created_at) VALUES (@id, @email, @name, @passwordHash, @role, @subscription, @createdAt)",
);
const stmtDeleteAllUsers = db.prepare("DELETE FROM users");

// --- domains ---
const stmtSelectDomains = db.prepare("SELECT * FROM domains ORDER BY created_at");
const stmtInsertDomain = db.prepare(
  "INSERT OR IGNORE INTO domains (id, owner_id, domain, status, verification_token, created_at, verified_at, dkim_selector, dkim_public_key, dkim_private_key, dkim_status) VALUES (@id, @ownerId, @domain, @status, @verificationToken, @createdAt, @verifiedAt, @dkimSelector, @dkimPublicKey, @dkimPrivateKey, @dkimStatus)",
);
const stmtDeleteAllDomains = db.prepare("DELETE FROM domains");

// --- mailboxes ---
const stmtSelectMailboxes = db.prepare("SELECT * FROM mailboxes ORDER BY created_at");
const stmtInsertMailbox = db.prepare(
  "INSERT OR IGNORE INTO mailboxes (id, owner_id, domain_id, email, name, quota_mb, recovery_email, created_at) VALUES (@id, @ownerId, @domainId, @email, @name, @quotaMb, @recoveryEmail, @createdAt)",
);
const stmtDeleteAllMailboxes = db.prepare("DELETE FROM mailboxes");

// --- aliases ---
const stmtSelectAliases = db.prepare("SELECT * FROM aliases ORDER BY created_at");
const stmtInsertAlias = db.prepare(
  "INSERT OR IGNORE INTO aliases (id, owner_id, domain_id, mailcow_id, address, goto, active, created_at) VALUES (@id, @ownerId, @domainId, @mailcowId, @address, @goto, @active, @createdAt)",
);
const stmtDeleteAllAliases = db.prepare("DELETE FROM aliases");

// ---------------------------------------------------------------------------
// Row mapping helpers
// ---------------------------------------------------------------------------

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    passwordHash: row.password_hash as string,
    role: row.role as UserRole,
    subscription: row.subscription as SubscriptionTier,
    createdAt: row.created_at as string,
  };
}

function rowToDomain(row: Record<string, unknown>): DomainRecord {
  const dkimSelector = row.dkim_selector as string | null;
  const dkimPublicKey = row.dkim_public_key as string | null;
  const dkimPrivateKey = row.dkim_private_key as string | null;
  const dkimStatus = row.dkim_status as string | null;

  const record: DomainRecord = {
    id: row.id as string,
    ownerId: row.owner_id as string,
    domain: row.domain as string,
    status: row.status as DomainStatus,
    verificationToken: row.verification_token as string,
    createdAt: row.created_at as string,
    verifiedAt: (row.verified_at as string) ?? undefined,
  };

  if (dkimSelector && dkimPublicKey && dkimPrivateKey && dkimStatus) {
    record.dkim = {
      selector: dkimSelector,
      publicKey: dkimPublicKey,
      privateKey: dkimPrivateKey,
      status: dkimStatus as "pending_dns" | "active",
    };
  }

  return record;
}

function rowToMailbox(row: Record<string, unknown>): MailboxRecord {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    domainId: row.domain_id as string,
    email: row.email as string,
    name: row.name as string,
    quotaMb: row.quota_mb as number,
    recoveryEmail: (row.recovery_email as string) ?? undefined,
    createdAt: row.created_at as string,
  };
}

function rowToAlias(row: Record<string, unknown>): AliasRecord {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    domainId: row.domain_id as string,
    mailcowId: row.mailcow_id as string,
    address: row.address as string,
    goto: row.goto as string,
    active: Boolean(row.active),
    createdAt: row.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// Domain-to-row mapping (for INSERT)
// ---------------------------------------------------------------------------

function domainToRow(d: DomainRecord) {
  return {
    id: d.id,
    ownerId: d.ownerId,
    domain: d.domain,
    status: d.status,
    verificationToken: d.verificationToken,
    createdAt: d.createdAt,
    verifiedAt: d.verifiedAt ?? null,
    dkimSelector: d.dkim?.selector ?? null,
    dkimPublicKey: d.dkim?.publicKey ?? null,
    dkimPrivateKey: d.dkim?.privateKey ?? null,
    dkimStatus: d.dkim?.status ?? null,
  };
}

// ---------------------------------------------------------------------------
// One-time migration from qrzmail.json
// ---------------------------------------------------------------------------

const DATA_DIR = process.env.QRZMAIL_DATA_DIR ?? path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "qrzmail.json");

function migrateFromJsonIfNeeded() {
  // Check if the users table is empty — if so, attempt migration
  const count = (db.prepare("SELECT COUNT(*) AS cnt FROM users").get() as { cnt: number }).cnt;
  if (count > 0) {
    return; // already migrated
  }

  if (!existsSync(DATA_FILE)) {
    return; // no JSON file to migrate from
  }

  // Read the JSON file (synchronous since we're already in a sync context)
  let raw: string;
  try {
    raw = require("fs").readFileSync(DATA_FILE, "utf8");
  } catch {
    return; // can't read, skip migration
  }

  let jsonData: Data;
  try {
    jsonData = JSON.parse(raw);
  } catch {
    return; // invalid JSON, skip
  }

  const insertAll = db.transaction(() => {
    for (const u of jsonData.users ?? []) {
      stmtInsertUser.run({
        id: u.id,
        email: u.email,
        name: u.name,
        passwordHash: u.passwordHash,
        role: u.role,
        subscription: u.subscription,
        createdAt: u.createdAt,
      });
    }
    for (const d of jsonData.domains ?? []) {
      stmtInsertDomain.run(domainToRow(d));
    }
    for (const m of jsonData.mailboxes ?? []) {
      stmtInsertMailbox.run({
        id: m.id,
        ownerId: m.ownerId,
        domainId: m.domainId,
        email: m.email,
        name: m.name,
        quotaMb: m.quotaMb,
        recoveryEmail: m.recoveryEmail ?? null,
        createdAt: m.createdAt,
      });
    }
    for (const a of jsonData.aliases ?? []) {
      stmtInsertAlias.run({
        id: a.id,
        ownerId: a.ownerId,
        domainId: a.domainId,
        mailcowId: a.mailcowId,
        address: a.address,
        goto: a.goto,
        active: a.active ? 1 : 0,
        createdAt: a.createdAt,
      });
    }
  });

  insertAll();
}

// Run migration once at module load
migrateFromJsonIfNeeded();

// ---------------------------------------------------------------------------
// Public API (identical signatures to the old JSON-based store)
// ---------------------------------------------------------------------------

export function readData(): Data {
  const users = (stmtSelectUsers.all() as Record<string, unknown>[]).map(rowToUser);
  const domains = (stmtSelectDomains.all() as Record<string, unknown>[]).map(rowToDomain);
  const mailboxes = (stmtSelectMailboxes.all() as Record<string, unknown>[]).map(rowToMailbox);
  const aliases = (stmtSelectAliases.all() as Record<string, unknown>[]).map(rowToAlias);

  return { users, domains, mailboxes, aliases };
}

export function writeData(data: Data) {
  const writeAll = db.transaction(() => {
    stmtDeleteAllUsers.run();
    stmtDeleteAllDomains.run();
    stmtDeleteAllMailboxes.run();
    stmtDeleteAllAliases.run();

    for (const u of data.users) {
      stmtInsertUser.run({
        id: u.id,
        email: u.email,
        name: u.name,
        passwordHash: u.passwordHash,
        role: u.role,
        subscription: u.subscription,
        createdAt: u.createdAt,
      });
    }
    for (const d of data.domains) {
      stmtInsertDomain.run(domainToRow(d));
    }
    for (const m of data.mailboxes) {
      stmtInsertMailbox.run({
        id: m.id,
        ownerId: m.ownerId,
        domainId: m.domainId,
        email: m.email,
        name: m.name,
        quotaMb: m.quotaMb,
        recoveryEmail: m.recoveryEmail ?? null,
        createdAt: m.createdAt,
      });
    }
    for (const a of data.aliases) {
      stmtInsertAlias.run({
        id: a.id,
        ownerId: a.ownerId,
        domainId: a.domainId,
        mailcowId: a.mailcowId,
        address: a.address,
        goto: a.goto,
        active: a.active ? 1 : 0,
        createdAt: a.createdAt,
      });
    }
  });

  writeAll();
}

export function updateData<T>(callback: (data: Data) => T | Promise<T>): T {
  const data = readData();
  const result = callback(data);
  // If the callback returned a Promise, we need to handle it
  if (result instanceof Promise) {
    throw new Error(
      "updateData does not support async callbacks with SQLite. " +
        "All callbacks must be synchronous.",
    );
  }
  writeData(data);
  return result;
}

export function makeId() {
  return randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}
