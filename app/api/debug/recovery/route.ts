import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcrypt";

export const runtime = "nodejs";

/**
 * Debug endpoint to inspect stored recovery data for a given email.
 * Only accessible if DEBUG_MODE env var is set to "true".
 * 
 * Usage:
 *   GET  /api/debug/recovery?email=user@qrzmail.com  — inspect recovery data
 *   POST /api/debug/recovery                          — test code or regenerate codes
 *     Body: { email: "user@qrzmail.com", code?: "ABCD-1234", action?: "regenerate" }
 * 
 * Actions:
 *   - (no action) + code: test bcrypt comparison against stored hashes
 *   - action="regenerate": generate new backup codes (marks old ones as used)
 */
export async function GET(request: Request) {
  if (process.env.DEBUG_MODE !== "true") {
    return NextResponse.json({ error: "Debug mode is not enabled" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email query parameter is required" }, { status: 400 });
  }

  const data = await inspectRecoveryData(email);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  if (process.env.DEBUG_MODE !== "true") {
    return NextResponse.json({ error: "Debug mode is not enabled" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Action: regenerate backup codes
    if (body.action === "regenerate") {
      return regenerateCodes(email);
    }

    // Default: test code + inspect
    const result = await inspectRecoveryData(email);

    // If a code was provided, test it
    if (body.code) {
      const rawCode = body.code.replace(/[^A-Z0-9]/gi, "").toUpperCase();
      const unusedCodes = db.prepare("SELECT id, code_hash FROM recovery_codes WHERE email = ? AND used = 0").all(email) as { id: number; code_hash: string }[];

      const comparisons = unusedCodes.map(row => ({
        id: row.id,
        match: bcrypt.compareSync(rawCode, row.code_hash),
        hashPrefix: row.code_hash.substring(0, 20),
      }));

      return NextResponse.json({
        ...result,
        codeTest: {
          inputCode: body.code,
          cleanedCode: rawCode,
          codeLength: rawCode.length,
          comparisons,
          anyMatched: comparisons.some(c => c.match),
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Debug recovery error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function inspectRecoveryData(email: string): Promise<{
  email: string;
  userRecovery: object | null;
  recoveryCodes: {
    total: number;
    unused: number;
    codes: unknown[];
  };
}> {
  const userRecovery = db.prepare("SELECT * FROM user_recovery WHERE email = ?").get(email);
  const allCodes = db.prepare("SELECT id, substr(code_hash, 1, 20) AS hash_prefix, used, created_at FROM recovery_codes WHERE email = ? ORDER BY id").all(email);
  const unusedCount = (db.prepare("SELECT COUNT(*) AS cnt FROM recovery_codes WHERE email = ? AND used = 0").get(email) as { cnt: number } | undefined)?.cnt ?? 0;

  return {
    email,
    userRecovery: userRecovery || null,
    recoveryCodes: {
      total: (allCodes as any[]).length,
      unused: unusedCount,
      codes: allCodes,
    },
  };
}

async function regenerateCodes(email: string) {
  // Check if user exists
  const user = db.prepare("SELECT email FROM user_recovery WHERE email = ?").get(email);
  if (!user) {
    return NextResponse.json({ error: "No recovery data found for this email" }, { status: 404 });
  }

  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rawCodes: string[] = [];
  const displayCodes: string[] = [];

  const generateCode = () => {
    let raw = "";
    for (let i = 0; i < 8; i++) {
      raw += charset[Math.floor(Math.random() * charset.length)];
    }
    return raw;
  };

  const transaction = db.transaction(() => {
    // Mark all existing unused codes as used
    db.prepare("UPDATE recovery_codes SET used = 1 WHERE email = ? AND used = 0").run(email);

    // Insert 10 new codes
    const insertCode = db.prepare("INSERT INTO recovery_codes (email, code_hash) VALUES (?, ?)");
    for (let i = 0; i < 10; i++) {
      const rawCode = generateCode();
      rawCodes.push(rawCode);
      displayCodes.push(`${rawCode.slice(0, 4)}-${rawCode.slice(4)}`);
      const hashed = bcrypt.hashSync(rawCode, 10);
      insertCode.run(email, hashed);
    }
  });

  transaction();

  return NextResponse.json({
    success: true,
    message: "New backup codes generated. Old unused codes have been invalidated.",
    codes: displayCodes,
  });
}
