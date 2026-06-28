import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/webmail";
import { getWebmailSession } from "@/lib/webmail-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getWebmailSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let body: Record<string, unknown> = {};
  const attachments: Array<{ filename: string; contentType: string; content: Buffer }> = [];

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    body = Object.fromEntries(form.entries());
    for (const file of form.getAll("attachments")) {
      if (!(file instanceof File) || file.size === 0) continue;
      attachments.push({
        filename: file.name || "attachment",
        contentType: file.type || "application/octet-stream",
        content: Buffer.from(await file.arrayBuffer()),
      });
    }
  } else {
    body = await request.json().catch(() => ({}));
  }

  const to = String(body.to ?? "").trim();
  const cc = String(body.cc ?? "").trim();
  const bcc = String(body.bcc ?? "").trim();
  const subject = String(body.subject ?? "");
  const text = String(body.text ?? "");
  const html = String(body.html ?? "");

  if (!to) {
    return NextResponse.json({ error: "Recipient is required." }, { status: 400 });
  }

  if (!text.trim() && !html.replace(/<[^>]+>/g, "").trim()) {
    return NextResponse.json({ error: "Message body is required." }, { status: 400 });
  }

  try {
    await sendMessage(session, { to, cc, bcc, subject, text, html, attachments });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Could not send message." }, { status: 502 });
  }
}
