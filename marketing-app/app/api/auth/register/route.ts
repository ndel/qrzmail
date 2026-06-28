import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/db";
import { hashPassword, createSessionToken, MARKETING_SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = db.prepare("SELECT id FROM marketing_users WHERE email = ?").get(normalizedEmail);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const id = crypto.randomUUID();
    const passwordHash = hashPassword(password);

    db.prepare(`
      INSERT INTO marketing_users (id, email, name, password_hash)
      VALUES (?, ?, ?, ?)
    `).run(id, normalizedEmail, name.trim(), passwordHash);

    const token = createSessionToken({ id, email: normalizedEmail, name: name.trim() });
    const response = NextResponse.json({
      success: true,
      user: { id, email: normalizedEmail, name: name.trim() },
    });
    response.cookies.set(MARKETING_SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
