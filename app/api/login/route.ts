import { NextResponse } from "next/server";
import tls from "node:tls";
import { log, logRequest, logResponse, parseJsonBody } from "@/lib/middleware";

export const runtime = "nodejs";

const MAIL_DOMAIN = process.env.MAIL_DOMAIN ?? "qrzmail.com";
const IMAP_HOST = process.env.IMAP_HOST ?? "mail.qrzmail.com";
const IMAP_PORT = Number(process.env.IMAP_PORT ?? 993);
const IMAP_SERVERNAME = process.env.IMAP_SERVERNAME ?? IMAP_HOST;
const WEBMAIL_URL = process.env.WEBMAIL_URL ?? "https://mail.qrzmail.com/SOGo/";

type LoginBody = {
  email?: string;
  password?: string;
};

function quoteImap(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function readUntil(socket: tls.TLSSocket, matcher: RegExp, timeoutMs = 8000) {
  return new Promise<string>((resolve, reject) => {
    let buffer = "";
    const timeout = setTimeout(() => cleanup(reject, new Error("IMAP timed out.")), timeoutMs);

    function cleanup(callback: (value: never) => void, value: Error): void;
    function cleanup(callback: (value: string) => void, value: string): void;
    function cleanup(callback: ((value: never) => void) | ((value: string) => void), value: Error | string) {
      clearTimeout(timeout);
      socket.off("data", onData);
      socket.off("error", onError);
      callback(value as never);
    }

    function onData(chunk: Buffer) {
      buffer += chunk.toString("utf8");
      if (matcher.test(buffer)) {
        cleanup(resolve, buffer);
      }
    }

    function onError(error: Error) {
      cleanup(reject, error);
    }

    socket.on("data", onData);
    socket.on("error", onError);
  });
}

async function verifyImapLogin(email: string, password: string) {
  const socket = tls.connect({
    host: IMAP_HOST,
    port: IMAP_PORT,
    servername: IMAP_SERVERNAME,
  });

  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("secureConnect", resolve);
      socket.once("error", reject);
      socket.setTimeout(9000, () => reject(new Error("IMAP connection timed out.")));
    });

    await readUntil(socket, /^\* OK/m);
    socket.write(`a1 LOGIN ${quoteImap(email)} ${quoteImap(password)}\r\n`);
    const loginResponse = await readUntil(socket, /^a1 (OK|NO|BAD)/m);
    socket.write("a2 LOGOUT\r\n");

    return /^a1 OK/m.test(loginResponse);
  } finally {
    socket.destroy();
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  logRequest(request, startTime);

  // Parse body with size limit
  const parsed = await parseJsonBody<LoginBody>(request);
  if (!parsed.ok) {
    logResponse(request, parsed.error, startTime);
    return parsed.error;
  }
  const body = parsed.data;

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email.endsWith(`@${MAIL_DOMAIN}`)) {
    const response = NextResponse.json(
      { error: `Use your @${MAIL_DOMAIN} address.` },
      { status: 400 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  if (!password) {
    const response = NextResponse.json({ error: "Password is required." }, { status: 400 });
    logResponse(request, response, startTime);
    return response;
  }

  const valid = await verifyImapLogin(email, password).catch(() => false);

  if (!valid) {
    log("warn", "Webmail login failed", { email });
    const response = NextResponse.json(
      { error: "Email address or password is incorrect." },
      { status: 401 },
    );
    logResponse(request, response, startTime);
    return response;
  }

  log("info", "Webmail login successful", { email });

  const response = NextResponse.json({ webmailUrl: WEBMAIL_URL });
  logResponse(request, response, startTime);
  return response;
}
