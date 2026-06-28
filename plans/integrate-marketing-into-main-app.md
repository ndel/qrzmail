# Plan: Integrate Marketing App into Main QRZMail App

## Overview

Move the marketing email campaign functionality from the separate `marketing-app/` sub-app (deployed as a standalone Docker container at `/marketing`) into the main QRZMail Next.js app as a new feature area, accessible at `/marketing/*` routes within the same app.

## Current Architecture

```
qrzmail.com (main app, Docker container qrzmail-web)
├── / (landing page)
├── /domains/* (domain panel - authenticated)
├── /admin/* (admin panel - superadmin only)
├── /mail/* (webmail)
├── /api/* (API routes)
└── /marketing/* → proxied to qrzmail-marketing container (separate app)

qrzmail-marketing (separate Docker container)
├── /marketing/login (separate auth)
├── /marketing/campaigns/*
├── /marketing/contacts/*
├── /marketing/lists/*
├── /marketing/templates/*
├── /marketing/providers/*
├── /marketing/segments/*
└── /marketing/api/* (separate API routes)
```

## Target Architecture

```
qrzmail.com (single Docker container qrzmail-web)
├── / (landing page)
├── /domains/* (domain panel - authenticated)
├── /admin/* (admin panel - superadmin only)
├── /mail/* (webmail)
├── /marketing/* (new feature - authenticated via main app's session)
│   ├── page.tsx (dashboard)
│   ├── campaigns/*
│   ├── contacts/*
│   ├── lists/*
│   ├── templates/*
│   ├── providers/*
│   ├── segments/*
│   └── api/* (API routes)
├── /api/account/* (existing auth)
└── /api/marketing/* (new API routes)
```

## Key Design Decisions

### 1. Authentication
- **Use main app's existing session cookie** (`qrzmail_account_session`) instead of the separate marketing session cookie
- Marketing pages will check `getCurrentUser()` from `lib/auth.ts` (main app)
- No separate login page needed - users authenticate via the existing domain panel login
- The `requireUser()` helper from main app's `lib/auth.ts` already returns the user object

### 2. Database
- **Add marketing tables to the main app's database** (`lib/db.ts`) rather than a separate SQLite file
- The main app already uses `better-sqlite3` with the same database at `QRZMAIL_DATA_DIR/qrzmail.db`
- Marketing tables will use `owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE` to link to existing users
- This eliminates the need for a separate marketing_users table

### 3. File Structure
- Move marketing pages into `app/marketing/` directory
- Move marketing API routes into `app/api/marketing/` directory
- Move marketing library code into `lib/marketing/` directory
- Keep marketing-specific dependencies (nodemailer, imapflow, mailparser) - they're already in main app's package.json

### 4. Dependencies
- All marketing app dependencies (`nodemailer`, `imapflow`, `mailparser`, `better-sqlite3`) are already in the main app's `package.json`
- No additional npm packages needed

### 5. Deployment
- Remove the separate `qrzmail-marketing` Docker container
- Remove the nginx proxy config for `/marketing/`
- The main `qrzmail-web` container will serve marketing routes directly
- No changes to `docker-compose.prod.yml` needed (same container)

## Migration Steps

### Step 1: Add Marketing Tables to Main Database
**File: `lib/db.ts`**
- Add marketing tables: `marketing_providers`, `marketing_lists`, `marketing_contacts`, `marketing_templates`, `marketing_campaigns`, `marketing_queue`, `marketing_tracking`
- All tables use `owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- Add indexes on `owner_id` columns

### Step 2: Create Marketing Library Files
**New files in `lib/marketing/`:**
- `lib/marketing/smtp.ts` - SMTP transport (copy from `marketing-app/lib/smtp.ts`, adapt imports)
- `lib/marketing/imap.ts` - IMAP bounce checking (copy from `marketing-app/lib/imap.ts`, adapt imports)
- `lib/marketing/queue.ts` - Campaign queue (copy from `marketing-app/lib/queue.ts`, adapt to use main db)
- `lib/marketing/tracking.ts` - Open/click tracking (copy from `marketing-app/lib/tracking.ts`, adapt imports)
- `lib/marketing/segmentation.ts` - Segment evaluation (copy from `marketing-app/lib/segmentation.ts`, adapt imports)
- `lib/marketing/worker.ts` - Background worker (copy from `marketing-app/lib/worker.ts`, adapt imports)
- `lib/marketing/deepseek.ts` - AI content generation (copy from `marketing-app/lib/deepseek.ts`)

### Step 3: Create Marketing API Routes
**New files in `app/api/marketing/`:**
- `app/api/marketing/stats/route.ts` - Dashboard stats
- `app/api/marketing/providers/route.ts` - List/create providers
- `app/api/marketing/providers/[id]/route.ts` - Get/update/delete provider
- `app/api/marketing/providers/verify/route.ts` - Verify SMTP connection
- `app/api/marketing/lists/route.ts` - List/create lists
- `app/api/marketing/lists/[id]/route.ts` - Get/update/delete list
- `app/api/marketing/contacts/route.ts` - List/create contacts
- `app/api/marketing/contacts/[id]/route.ts` - Get/update/delete contact
- `app/api/marketing/contacts/import/route.ts` - Bulk import contacts
- `app/api/marketing/contacts/find/route.ts` - Find contacts
- `app/api/marketing/templates/route.ts` - List/create templates
- `app/api/marketing/templates/[id]/route.ts` - Get/update/delete template
- `app/api/marketing/campaigns/route.ts` - List/create/send/pause/resume campaigns
- `app/api/marketing/campaigns/[id]/route.ts` - Get/update/delete campaign
- `app/api/marketing/campaigns/[id]/recipients/route.ts` - Campaign recipients
- `app/api/marketing/segments/route.ts` - List/create segments
- `app/api/marketing/segments/[id]/route.ts` - Get/update/delete segment
- `app/api/marketing/track/open/route.ts` - Track email opens
- `app/api/marketing/track/click/route.ts` - Track link clicks
- `app/api/marketing/unsubscribe/route.ts` - Handle unsubscribes
- `app/api/marketing/worker/route.ts` - Worker trigger endpoint

**Key change in all API routes:** Replace `import { requireUser } from "@/lib/auth"` (marketing auth) with `import { getCurrentUser } from "@/lib/auth"` (main app auth). Use `getCurrentUser()` which returns the main app's User type with `id`, `email`, `name`, `role`.

### Step 4: Create Marketing Frontend Pages
**New files in `app/marketing/`:**
- `app/marketing/page.tsx` - Dashboard (copy from `marketing-app/app/page.tsx`, remove basePath prefix)
- `app/marketing/layout.tsx` - Layout with sidebar (copy from `marketing-app/app/sidebar.tsx` + `marketing-app/app/layout.tsx`)
- `app/marketing/campaigns/page.tsx` - Campaign list
- `app/marketing/campaigns/new/page.tsx` - New campaign
- `app/marketing/campaigns/[id]/page.tsx` - Campaign detail
- `app/marketing/contacts/page.tsx` - Contact list
- `app/marketing/contacts/find/page.tsx` - Find contacts
- `app/marketing/lists/page.tsx` - List overview
- `app/marketing/lists/new/page.tsx` - New list
- `app/marketing/lists/[id]/page.tsx` - List detail
- `app/marketing/templates/page.tsx` - Template list
- `app/marketing/templates/new/page.tsx` - New template
- `app/marketing/templates/[id]/page.tsx` - Edit template
- `app/marketing/providers/page.tsx` - Provider management
- `app/marketing/segments/page.tsx` - Segment management

**Key changes in all frontend pages:**
- Remove `basePath: "/marketing"` references - routes are now directly at `/marketing/...`
- Change `fetch("/api/...")` to `fetch("/api/marketing/...")` 
- Change `router.push("/")` to `router.push("/marketing")`
- Change `router.push("/login")` to `router.push("/domains/login")` (main app login)
- Use main app's auth check instead of marketing's separate auth

### Step 5: Add Marketing Link to Navigation
**File: `app/components/nav-user.tsx`**
- Add "Marketing" link in the authenticated user navigation
- Link to `/marketing`

### Step 6: Remove Separate Marketing Deployment
- Stop and remove the `qrzmail-marketing` Docker container on the VPS
- Remove the nginx `/marketing/` proxy_pass configuration
- Remove the `marketing-app/` directory from the repo (or keep as reference)
- Remove `deploy/deploy-qrzmail-marketing.sh` and `deploy/extract-marketing-app.sh`

### Step 7: Rebuild and Deploy
- Rebuild the main `qrzmail-web` Docker container (includes marketing code now)
- Restart the container
- Verify `/marketing` routes work directly

## File Changes Summary

| Action | File |
|--------|------|
| **MODIFY** | `lib/db.ts` - Add marketing tables |
| **CREATE** | `lib/marketing/smtp.ts` |
| **CREATE** | `lib/marketing/imap.ts` |
| **CREATE** | `lib/marketing/queue.ts` |
| **CREATE** | `lib/marketing/tracking.ts` |
| **CREATE** | `lib/marketing/segmentation.ts` |
| **CREATE** | `lib/marketing/worker.ts` |
| **CREATE** | `lib/marketing/deepseek.ts` |
| **CREATE** | `app/marketing/page.tsx` (dashboard) |
| **CREATE** | `app/marketing/layout.tsx` (with sidebar) |
| **CREATE** | `app/marketing/campaigns/page.tsx` |
| **CREATE** | `app/marketing/campaigns/new/page.tsx` |
| **CREATE** | `app/marketing/campaigns/[id]/page.tsx` |
| **CREATE** | `app/marketing/contacts/page.tsx` |
| **CREATE** | `app/marketing/contacts/find/page.tsx` |
| **CREATE** | `app/marketing/lists/page.tsx` |
| **CREATE** | `app/marketing/lists/new/page.tsx` |
| **CREATE** | `app/marketing/lists/[id]/page.tsx` |
| **CREATE** | `app/marketing/templates/page.tsx` |
| **CREATE** | `app/marketing/templates/new/page.tsx` |
| **CREATE** | `app/marketing/templates/[id]/page.tsx` |
| **CREATE** | `app/marketing/providers/page.tsx` |
| **CREATE** | `app/marketing/segments/page.tsx` |
| **CREATE** | `app/api/marketing/stats/route.ts` |
| **CREATE** | `app/api/marketing/providers/route.ts` |
| **CREATE** | `app/api/marketing/providers/[id]/route.ts` |
| **CREATE** | `app/api/marketing/providers/verify/route.ts` |
| **CREATE** | `app/api/marketing/lists/route.ts` |
| **CREATE** | `app/api/marketing/lists/[id]/route.ts` |
| **CREATE** | `app/api/marketing/contacts/route.ts` |
| **CREATE** | `app/api/marketing/contacts/[id]/route.ts` |
| **CREATE** | `app/api/marketing/contacts/import/route.ts` |
| **CREATE** | `app/api/marketing/contacts/find/route.ts` |
| **CREATE** | `app/api/marketing/templates/route.ts` |
| **CREATE** | `app/api/marketing/templates/[id]/route.ts` |
| **CREATE** | `app/api/marketing/campaigns/route.ts` |
| **CREATE** | `app/api/marketing/campaigns/[id]/route.ts` |
| **CREATE** | `app/api/marketing/campaigns/[id]/recipients/route.ts` |
| **CREATE** | `app/api/marketing/segments/route.ts` |
| **CREATE** | `app/api/marketing/segments/[id]/route.ts` |
| **CREATE** | `app/api/marketing/track/open/route.ts` |
| **CREATE** | `app/api/marketing/track/click/route.ts` |
| **CREATE** | `app/api/marketing/unsubscribe/route.ts` |
| **CREATE** | `app/api/marketing/worker/route.ts` |
| **MODIFY** | `app/components/nav-user.tsx` - Add Marketing link |
| **DELETE** | `marketing-app/` directory (or archive) |
| **DELETE** | `deploy/deploy-qrzmail-marketing.sh` |
| **DELETE** | `deploy/extract-marketing-app.sh` |
| **MODIFY** | VPS nginx config - Remove `/marketing/` proxy_pass |

## Auth Integration Details

The main app's `getCurrentUser()` from `lib/auth.ts`:
```typescript
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE_NAME)?.value);
  if (!session) return null;
  const data = await readData();
  return data.users.find((user) => user.id === session.userId) ?? null;
}
```

Marketing API routes will use this directly:
```typescript
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ... use user.id to filter data
}
```

## Risk Assessment

1. **Database migration**: Adding tables to the existing `qrzmail.db` is safe - `CREATE TABLE IF NOT EXISTS` won't affect existing data
2. **Auth compatibility**: Main app's session cookie is already HMAC-signed with `SESSION_SECRET` - same security level
3. **Route conflicts**: No existing routes at `/marketing/*` in the main app
4. **Build size**: Marketing code adds ~50KB to the bundle (mostly UI components)
5. **Worker**: The background worker for sending emails needs to be triggered - can use the existing `/api/marketing/worker` endpoint or a cron job
