import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readData } from "@/lib/store";

export const runtime = "nodejs";

/**
 * GET /api/admin
 *
 * Superadmin-only endpoint that returns all users, domains, mailboxes,
 * and aliases across the entire platform.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const data = await readData();

  // Return everything — superadmin sees all
  return NextResponse.json({
    users: data.users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      subscription: u.subscription,
      createdAt: u.createdAt,
    })),
    domains: data.domains,
    mailboxes: data.mailboxes,
    aliases: data.aliases,
  });
}
