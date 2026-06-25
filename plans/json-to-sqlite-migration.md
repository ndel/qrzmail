# JSON to SQLite Migration Plan

## Problem

The application currently stores all domain, mailbox, alias, and user data in a single JSON file (`.data/qrzmail.json`) via [`lib/store.ts`](lib/store.ts). This causes:

- **Race conditions** — concurrent requests can corrupt the file
- **No atomicity** — partial writes lose data
- **Full-file reads** — every operation reads the entire dataset into memory
- **No indexing** — filtering requires scanning all records
- **No constraints** — no foreign keys, unique constraints, or type enforcement
- **Sync fragility** — as seen with the server having stale data

The project already uses **better-sqlite3** (synchronous, fast, zero-config) in [`lib/db.ts`](lib/db.ts) for recovery emails and reset tokens. We'll extend this to store all domain management data.

---

## Architecture

### SQLite Schema (new tables in existing `qrzmail.db`)

```sql
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

CREATE INDEX IF NOT EXISTS idx_domains_owner_id ON domains(owner_id);
CREATE INDEX IF NOT EXISTS idx_mailboxes_domain_id ON mailboxes(domain_id);
CREATE INDEX IF NOT EXISTS idx_mailboxes_owner_id ON mailboxes(owner_id);
CREATE INDEX IF NOT EXISTS idx_aliases_domain_id ON aliases(domain_id);
```

### Migration Strategy

1. **Add schema initialization** to [`lib/db.ts`](lib/db.ts) (the new tables above)
2. **Rewrite [`lib/store.ts`](lib/store.ts)** to use SQLite instead of JSON file I/O, keeping the same exported TypeScript types and function signatures (`readData`, `writeData`, `updateData`, `makeId`, `nowIso`)
3. **Add a one-time data migration** that reads existing `qrzmail.json` and inserts into SQLite if the tables are empty
4. **No changes needed** in any of the 17 API route files — they all import from `lib/store` and use the same function signatures

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | SQLite (better-sqlite3) | Already in project, zero-config, file-based, no server needed |
| ORM | None (raw SQL) | Simple schema, minimal queries, better-sqlite3 is already synchronous |
| Migration | One-time import from JSON | Simple, transparent, no migration framework needed |
| API surface | Identical `readData`/`updateData` | Zero changes to 17 route files |
| Thread safety | SQLite WAL mode + synchronous writes | Already configured in `lib/db.ts` |

---

## Files to Modify

### 1. [`lib/db.ts`](lib/db.ts) — Add schema tables

Add CREATE TABLE statements for `users`, `domains`, `mailboxes`, `aliases` alongside existing recovery tables.

### 2. [`lib/store.ts`](lib/store.ts) — Rewrite to use SQLite

Replace JSON file I/O with SQLite queries. Keep the same exported types and function signatures:

- `readData()` → reads all data from SQLite tables, returns `Data` object
- `writeData(data)` → writes all data to SQLite (used for bulk operations)
- `updateData(callback)` → reads, calls callback, writes back (transactional)
- `makeId()` → unchanged (randomUUID)
- `nowIso()` → unchanged

### 3. [`lib/auth.ts`](lib/auth.ts) — Minor update

The `getCurrentUser()` function uses `readData()` which will now query SQLite. No signature change needed.

### 4. [`Dockerfile`](Dockerfile) — No changes needed

SQLite (`better-sqlite3`) is already a dependency and compiles natively on Alpine.

---

## Migration Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  qrzmail.json │────>│  store.ts    │────>│  qrzmail.db │
│  (old)       │     │  (new SQLite)│     │  (SQLite)   │
└─────────────┘     └──────────────┘     └─────────────┘
                          │
                          │ reads JSON on first run
                          │ if DB tables are empty
                          │ migrates all data
                          │
                    ┌─────┴──────┐
                    │ 17 API     │
                    │ route files │
                    │ (unchanged) │
                    └────────────┘
```

---

## Implementation Steps

### Step 1: Update [`lib/db.ts`](lib/db.ts)
- Add the 4 new CREATE TABLE statements
- Add indexes
- Keep existing recovery tables intact

### Step 2: Rewrite [`lib/store.ts`](lib/store.ts)
- Import `db` from `./db`
- Replace `readData` with SQL SELECT queries across all 4 tables
- Replace `writeData` with DELETE + INSERT (or UPSERT) across all 4 tables
- Replace `updateData` to use `db.transaction()` for atomicity
- Add migration logic: on first `readData()`, check if tables are empty, if so import from `qrzmail.json`
- Keep all TypeScript types unchanged

### Step 3: Build & test locally
- `npm run build` must succeed
- Test: login, view domains, view mailboxes, create/delete operations

### Step 4: Deploy to server
- Archive and deploy via existing deploy script
- The existing `qrzmail.json` on the server will be auto-migrated to SQLite on first request

---

## Rollback Plan

If the migration fails:
1. The `qrzmail.json` file is **not deleted** during migration — it's only read from
2. Revert [`lib/store.ts`](lib/store.ts) and [`lib/db.ts`](lib/db.ts) to previous versions
3. Delete `qrzmail.db` to force re-read from JSON
4. Redeploy

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Data loss during migration | JSON file is read-only, never deleted; migration only runs if DB tables are empty |
| SQLite locking under concurrent load | WAL mode already enabled; better-sqlite3 is synchronous and handles this well |
| better-sqlite3 native module on Alpine | Already works (it's in package.json and used in production) |
| Schema changes in future | Add new columns with ALTER TABLE or recreate; migration only runs once |
