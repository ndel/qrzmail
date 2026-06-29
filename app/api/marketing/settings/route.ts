import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import db from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/marketing/settings
 * Returns the settings object for the current user.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = db
    .prepare("SELECT settings FROM user_settings WHERE user_id = ?")
    .get(user.id) as { settings: string } | undefined;

  let settings: Record<string, unknown> = {};
  if (row) {
    try {
      settings = JSON.parse(row.settings);
    } catch {
      settings = {};
    }
  }

  return NextResponse.json({ settings });
}

/**
 * PUT /api/marketing/settings
 * Merges the provided settings into the current user's settings.
 * Body: { settings: { ... } }
 */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { settings?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.settings || typeof body.settings !== "object") {
    return NextResponse.json({ error: "Missing or invalid 'settings' field" }, { status: 400 });
  }

  // Read existing settings
  const row = db
    .prepare("SELECT settings FROM user_settings WHERE user_id = ?")
    .get(user.id) as { settings: string } | undefined;

  let existing: Record<string, unknown> = {};
  if (row) {
    try {
      existing = JSON.parse(row.settings);
    } catch {
      existing = {};
    }
  }

  // Merge new settings into existing
  const merged = { ...existing, ...body.settings };
  const mergedJson = JSON.stringify(merged);
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO user_settings (user_id, settings, updated_at)
     VALUES (@userId, @settings, @updatedAt)
     ON CONFLICT(user_id) DO UPDATE SET
       settings = @settings,
       updated_at = @updatedAt`,
  ).run({ userId: user.id, settings: mergedJson, updatedAt: now });

  return NextResponse.json({ settings: merged });
}
