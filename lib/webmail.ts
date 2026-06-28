import { ImapFlow, type FetchMessageObject, type ListResponse } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";

export const IMAP_HOST = process.env.IMAP_HOST ?? "mail.qrzmail.com";
export const IMAP_PORT = Number(process.env.IMAP_PORT ?? 993);
export const IMAP_SERVERNAME = process.env.IMAP_SERVERNAME ?? IMAP_HOST;
export const SMTP_SUBMISSION_HOST =
  process.env.SMTP_SUBMISSION_HOST ?? process.env.SMTP_HOST ?? "mail.qrzmail.com";
export const SMTP_SUBMISSION_PORT = Number(process.env.SMTP_SUBMISSION_PORT ?? 587);

export type MailCredentials = {
  email: string;
  password: string;
};

export type WebmailFolder = {
  path: string;
  name: string;
  specialUse?: string;
  unseen?: number;
  total?: number;
};

export type WebmailMessageSummary = {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: string;
  seen: boolean;
  flagged: boolean;
  answered: boolean;
  preview: string;
  hasAttachments: boolean;
};

export type WebmailMessageDetail = WebmailMessageSummary & {
  html: string | null;
  text: string;
  attachments: Array<{
    id: number;
    filename: string;
    contentType: string;
    size: number;
  }>;
};

export type MessageAction = "read" | "unread" | "flag" | "unflag";

export type SendAttachment = {
  filename: string;
  contentType: string;
  content: Buffer;
};

export function normalizeMailboxEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function createImapClient(credentials: MailCredentials) {
  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: IMAP_PORT === 993,
    auth: {
      user: normalizeMailboxEmail(credentials.email),
      pass: credentials.password,
    },
    tls: {
      servername: IMAP_SERVERNAME,
    },
    logger: false,
  });

  await client.connect();
  return client;
}

function folderName(folder: ListResponse) {
  if (folder.specialUse === "\\Inbox") return "Inbox";
  return folder.name || folder.path;
}

type EnvelopeAddress = {
  name?: string;
  address?: string;
};

function addressList(value?: EnvelopeAddress[]) {
  return (value ?? [])
    .map((entry) => {
      const address = entry.address ?? "";
      return entry.name ? `${entry.name} <${address}>` : address;
    })
    .filter(Boolean)
    .join(", ");
}

function isoDate(value: string | Date | undefined) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function summaryFromMessage(message: FetchMessageObject): WebmailMessageSummary {
  const envelope = message.envelope;
  const flags = new Set(Array.from(message.flags ?? []).map(String));

  return {
    uid: message.uid,
    subject: envelope?.subject || "(No subject)",
    from: addressList(envelope?.from),
    to: addressList(envelope?.to),
    date: isoDate(envelope?.date ?? message.internalDate),
    seen: flags.has("\\Seen"),
    flagged: flags.has("\\Flagged"),
    answered: flags.has("\\Answered"),
    preview: "",
    hasAttachments: false,
  };
}

async function parsedPreview(source?: Buffer) {
  if (!source?.length) return { preview: "", hasAttachments: false };

  try {
    const parsed = await simpleParser(source);
    return {
      preview: (parsed.text ?? "").replace(/\s+/g, " ").trim().slice(0, 180),
      hasAttachments: (parsed.attachments?.length ?? 0) > 0,
    };
  } catch {
    return { preview: "", hasAttachments: false };
  }
}

export async function verifyMailboxLogin(credentials: MailCredentials) {
  const client = await createImapClient(credentials);
  await client.logout();
}

export async function listFolders(credentials: MailCredentials): Promise<WebmailFolder[]> {
  const client = await createImapClient(credentials);
  try {
    const folders = await client.list();
    const result: WebmailFolder[] = [];

    for (const folder of folders) {
      const status = await client.status(folder.path, { messages: true, unseen: true }).catch(() => null);
      result.push({
        path: folder.path,
        name: folderName(folder),
        specialUse: folder.specialUse,
        unseen: status?.unseen,
        total: status?.messages,
      });
    }

    return result.sort((a, b) => {
      const order = ["\\Inbox", "\\Sent", "\\Drafts", "\\Trash", "\\Junk"];
      const ai = order.indexOf(a.specialUse ?? "");
      const bi = order.indexOf(b.specialUse ?? "");
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.name.localeCompare(b.name);
    });
  } finally {
    await client.logout();
  }
}

export async function listMessages(
  credentials: MailCredentials,
  folder = "INBOX",
  limit = 50,
  search = "",
): Promise<WebmailMessageSummary[]> {
  const client = await createImapClient(credentials);
  try {
    const mailbox = await client.mailboxOpen(folder);
    if (!mailbox.exists) return [];

    const query = search.trim().toLowerCase();
    const fetchLimit = query ? Math.max(limit, 200) : limit;
    const range: string | number[] = `${Math.max(1, mailbox.exists - fetchLimit + 1)}:*`;

    const messages: WebmailMessageSummary[] = [];

    for await (const message of client.fetch(range, {
      envelope: true,
      flags: true,
      uid: true,
      internalDate: true,
      source: { start: 0, maxLength: 65536 },
    })) {
      const preview = await parsedPreview(message.source as Buffer | undefined);
      const summary = { ...summaryFromMessage(message), ...preview };
      if (!query) {
        messages.push(summary);
        continue;
      }

      const haystack = [
        summary.subject,
        summary.from,
        summary.to,
        summary.preview,
      ].join(" ").toLowerCase();
      if (haystack.includes(query)) {
        messages.push(summary);
      }
    }

    return messages.sort((a, b) => b.uid - a.uid).slice(0, limit);
  } finally {
    await client.logout();
  }
}

export async function getMessage(
  credentials: MailCredentials,
  folder: string,
  uid: number,
): Promise<WebmailMessageDetail | null> {
  const client = await createImapClient(credentials);
  try {
    await client.mailboxOpen(folder);
    const message = await client.fetchOne(uid, {
      envelope: true,
      flags: true,
      uid: true,
      internalDate: true,
      source: true,
    }, { uid: true });

    if (!message) return null;

    const parsed = await simpleParser(message.source as Buffer);
    const attachments = parsed.attachments ?? [];
    await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true }).catch(() => undefined);
    const summary = summaryFromMessage(message);

    return {
      ...summary,
      seen: true,
      html: typeof parsed.html === "string" ? parsed.html : null,
      text: parsed.text ?? "",
      preview: parsed.text?.slice(0, 220) ?? "",
      hasAttachments: attachments.length > 0,
      attachments: attachments.map((attachment, index) => ({
        id: index,
        filename: attachment.filename || "attachment",
        contentType: attachment.contentType || "application/octet-stream",
        size: attachment.content.byteLength,
      })),
    };
  } finally {
    await client.logout();
  }
}

export async function deleteMessage(credentials: MailCredentials, folder: string, uid: number) {
  const client = await createImapClient(credentials);
  try {
    await client.mailboxOpen(folder);
    await client.messageDelete(uid, { uid: true });
  } finally {
    await client.logout();
  }
}

export async function moveMessage(credentials: MailCredentials, folder: string, uid: number, destination: string) {
  const client = await createImapClient(credentials);
  try {
    await client.mailboxOpen(folder);
    await client.messageMove(uid, destination, { uid: true });
  } finally {
    await client.logout();
  }
}

export async function updateMessageFlags(
  credentials: MailCredentials,
  folder: string,
  uid: number,
  action: MessageAction,
) {
  const client = await createImapClient(credentials);
  try {
    await client.mailboxOpen(folder);
    if (action === "read") {
      await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
    } else if (action === "unread") {
      await client.messageFlagsRemove(uid, ["\\Seen"], { uid: true });
    } else if (action === "flag") {
      await client.messageFlagsAdd(uid, ["\\Flagged"], { uid: true });
    } else if (action === "unflag") {
      await client.messageFlagsRemove(uid, ["\\Flagged"], { uid: true });
    }
  } finally {
    await client.logout();
  }
}

export async function getAttachment(
  credentials: MailCredentials,
  folder: string,
  uid: number,
  attachmentId: number,
) {
  const client = await createImapClient(credentials);
  try {
    await client.mailboxOpen(folder);
    const message = await client.fetchOne(
      uid,
      {
        source: true,
      },
      { uid: true },
    );

    if (!message) return null;
    const parsed = await simpleParser(message.source as Buffer);
    const attachment = parsed.attachments?.[attachmentId];
    if (!attachment) return null;

    return {
      filename: attachment.filename || "attachment",
      contentType: attachment.contentType || "application/octet-stream",
      content: attachment.content,
    };
  } finally {
    await client.logout();
  }
}

function sentFolderName(folders: ListResponse[]) {
  return folders.find((folder) => folder.specialUse === "\\Sent")?.path ?? "Sent";
}

function headerValue(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function mimeBoundary() {
  return `qrzmail-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sentMessageSource(
  credentials: MailCredentials,
  input: { to: string; cc?: string; bcc?: string; subject: string; text: string; html?: string },
) {
  const hasHtml = Boolean(input.html?.trim());
  const boundary = mimeBoundary();
  const headers = [
    `From: ${headerValue(credentials.email)}`,
    `To: ${headerValue(input.to)}`,
    input.cc ? `Cc: ${headerValue(input.cc)}` : "",
    `Subject: ${headerValue(input.subject || "(No subject)")}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    hasHtml
      ? `Content-Type: multipart/alternative; boundary="${boundary}"`
      : "Content-Type: text/plain; charset=utf-8",
    hasHtml ? "" : "Content-Transfer-Encoding: 8bit",
  ].filter(Boolean);

  const text = input.text.replace(/\r?\n/g, "\r\n");
  if (!hasHtml) return `${headers.join("\r\n")}\r\n\r\n${text}`;

  return [
    headers.join("\r\n"),
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.html ?? "",
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

export async function sendMessage(
  credentials: MailCredentials,
  input: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    text: string;
    html?: string;
    attachments?: SendAttachment[];
  },
) {
  const transporter = nodemailer.createTransport({
    host: SMTP_SUBMISSION_HOST,
    port: SMTP_SUBMISSION_PORT,
    secure: SMTP_SUBMISSION_PORT === 465,
    requireTLS: SMTP_SUBMISSION_PORT !== 465,
    auth: {
      user: normalizeMailboxEmail(credentials.email),
      pass: credentials.password,
    },
  });

  await transporter.sendMail({
    from: credentials.email,
    to: input.to,
    cc: input.cc || undefined,
    bcc: input.bcc || undefined,
    subject: input.subject || "(No subject)",
    text: input.text,
    html: input.html || undefined,
    attachments: input.attachments?.map((attachment) => ({
      filename: attachment.filename,
      contentType: attachment.contentType,
      content: attachment.content,
    })),
  });

  const client = await createImapClient(credentials);
  try {
    const folders = await client.list();
    await client.append(sentFolderName(folders), sentMessageSource(credentials, input), ["\\Seen"], new Date());
  } finally {
    await client.logout();
  }
}
