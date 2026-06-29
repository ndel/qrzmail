import { NextResponse } from "next/server";
import { getCurrentSession, decryptMailboxPassword } from "@/lib/auth";
import { setWebmailSession } from "@/lib/webmail-session";

export const runtime = "nodejs";

/**
 * Auto-login to webmail using the mailbox password stored (encrypted) in the
 * main app session. This allows users who are already signed into the domain
 * or marketing panel to access the webmail without re-entering their password.
 *
 * POST /api/webmail/auto-login
 *
 * Returns 200 { email } on success.
 * Returns 401 if the main app session is missing or has no stored password.
 */
export async function POST() {
  const session = await getCurrentSession();
  if (!session?.email || !session.mp) {
    return NextResponse.json(
      { error: "No main app session or mailbox password not stored." },
      { status: 401 },
    );
  }

  const password = decryptMailboxPassword(session.mp);
  if (!password) {
    return NextResponse.json(
      { error: "Could not decrypt stored mailbox password." },
      { status: 401 },
    );
  }

  await setWebmailSession(session.email, password);
  return NextResponse.json({ email: session.email });
}
