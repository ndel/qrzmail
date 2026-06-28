import { NextResponse } from "next/server";
import { getAttachment } from "@/lib/webmail";
import { getWebmailSession } from "@/lib/webmail-session";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ uid: string; attachmentId: string }>;
};

function safeFilename(value: string) {
  return value.replace(/["\r\n\\]/g, "_");
}

export async function GET(request: Request, context: Params) {
  const session = await getWebmailSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { uid: uidParam, attachmentId: attachmentParam } = await context.params;
  const uid = Number(uidParam);
  const attachmentId = Number(attachmentParam);
  const folder = new URL(request.url).searchParams.get("folder") || "INBOX";

  if (!Number.isInteger(uid) || uid <= 0 || !Number.isInteger(attachmentId) || attachmentId < 0) {
    return NextResponse.json({ error: "Invalid attachment request." }, { status: 400 });
  }

  try {
    const attachment = await getAttachment(session, folder, uid, attachmentId);
    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
    }

    return new NextResponse(attachment.content, {
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Disposition": `attachment; filename="${safeFilename(attachment.filename)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not download attachment." }, { status: 502 });
  }
}
