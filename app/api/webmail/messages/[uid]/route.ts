import { NextResponse } from "next/server";
import { deleteMessage, getMessage, moveMessage, updateMessageFlags, type MessageAction } from "@/lib/webmail";
import { getWebmailSession } from "@/lib/webmail-session";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ uid: string }>;
};

function requestContext(request: Request, uidParam: string) {
  const url = new URL(request.url);
  return {
    folder: url.searchParams.get("folder") || "INBOX",
    uid: Number(uidParam),
  };
}

export async function GET(request: Request, context: Params) {
  const session = await getWebmailSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { uid: uidParam } = await context.params;
  const { folder, uid } = requestContext(request, uidParam);
  if (!Number.isInteger(uid) || uid <= 0) {
    return NextResponse.json({ error: "Invalid message id." }, { status: 400 });
  }

  try {
    const message = await getMessage(session, folder, uid);
    if (!message) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: "Could not load message." }, { status: 502 });
  }
}

export async function DELETE(request: Request, context: Params) {
  const session = await getWebmailSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { uid: uidParam } = await context.params;
  const { folder, uid } = requestContext(request, uidParam);
  if (!Number.isInteger(uid) || uid <= 0) {
    return NextResponse.json({ error: "Invalid message id." }, { status: 400 });
  }

  try {
    await deleteMessage(session, folder, uid);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Could not delete message." }, { status: 502 });
  }
}

export async function PATCH(request: Request, context: Params) {
  const session = await getWebmailSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { uid: uidParam } = await context.params;
  const { folder, uid } = requestContext(request, uidParam);
  if (!Number.isInteger(uid) || uid <= 0) {
    return NextResponse.json({ error: "Invalid message id." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");

  try {
    if (action === "move") {
      const destination = String(body.destination ?? "");
      if (!destination) {
        return NextResponse.json({ error: "Destination folder is required." }, { status: 400 });
      }
      await moveMessage(session, folder, uid, destination);
      return NextResponse.json({ success: true });
    }

    if (!["read", "unread", "flag", "unflag"].includes(action)) {
      return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }

    await updateMessageFlags(session, folder, uid, action as MessageAction);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Could not update message." }, { status: 502 });
  }
}
