const MAILCOW_API_URL = process.env.MAILCOW_API_URL ?? "https://nginx-mailcow";
const MAILCOW_API_KEY = process.env.MAILCOW_API_KEY;

export class MailcowApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "MailcowApiError";
  }
}

function formatMailcowMessage(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(formatMailcowMessage).filter(Boolean).join(" ");
  }

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return "";
}

export function isAlreadyExistsError(error: unknown) {
  return (
    error instanceof MailcowApiError &&
    /\b(already|exist|exists|duplicate)\b/i.test(error.message)
  );
}

async function mailcowRequest(path: string, body: unknown) {
  if (!MAILCOW_API_KEY) {
    throw new Error("MAILCOW_API_KEY is not configured.");
  }

  const { log } = await import("./middleware");
  log("info", "mailcowRequest", { path, bodyType: Array.isArray(body) ? "array" : typeof body });

  const response = await fetch(`${MAILCOW_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": MAILCOW_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json().catch(() => null);

  log("info", "mailcowRequest response", {
    path,
    status: response.status,
    ok: response.ok,
    resultPreview: result ? JSON.stringify(result).substring(0, 500) : null,
  });

  if (!response.ok) {
    throw new MailcowApiError(
      `Mail server request failed: ${formatMailcowMessage(result) || response.statusText}`,
      response.status,
    );
  }

  const entries = Array.isArray(result) ? result : [result];
  const failed = entries.find((entry) => entry?.type && entry.type !== "success");
  if (failed) {
    log("warn", "mailcowRequest rejected", {
      path,
      failedType: failed.type,
      failedMsg: formatMailcowMessage(failed.msg),
    });
    throw new MailcowApiError(
      formatMailcowMessage(failed.msg) || "Mail server rejected the request.",
      response.status,
    );
  }

  return result;
}

export async function addMailcowDomain(domain: string) {
  return mailcowRequest("/api/v1/add/domain", {
    active: 1,
    aliases: 50,
    backupmx: 0,
    defquota: 3072,
    description: `Managed by QRZMail for ${domain}`,
    domain,
    mailboxes: 50,
    maxquota: 10240,
    quota: 102400,
    relay_all_recipients: 0,
    rl_frame: "s",
    rl_value: 10,
  });
}

export async function addMailcowMailbox(input: {
  domain: string;
  localPart: string;
  name: string;
  password: string;
  quotaMb: number;
}) {
  return mailcowRequest("/api/v1/add/mailbox", {
    active: 1,
    authsource: "mailcow",
    domain: input.domain,
    force_pw_update: 0,
    local_part: input.localPart,
    name: input.name,
    password: input.password,
    password2: input.password,
    quota: input.quotaMb,
    tls_enforce_in: 0,
    tls_enforce_out: 0,
    sogo_access: 1,
    imap_access: 1,
    smtp_access: 1,
  });
}

export async function editMailcowMailbox(email: string, attr: Record<string, unknown>) {
  return mailcowRequest("/api/v1/edit/mailbox", {
    items: [email],
    attr,
  });
}

export async function deleteMailcowMailbox(email: string) {
  // Mailcow delete endpoints expect a flat array, not { items: [...] }
  return mailcowRequest("/api/v1/delete/mailbox", [email]);
}

export async function editMailcowDomain(domain: string, attr: Record<string, unknown>) {
  return mailcowRequest("/api/v1/edit/domain", {
    items: [domain],
    attr,
  });
}

export async function deleteMailcowDomain(domain: string) {
  // Mailcow delete endpoints expect a flat array, not { items: [...] }
  return mailcowRequest("/api/v1/delete/domain", [domain]);
}

export async function addMailcowAlias(input: {
  address: string;
  goto: string;
  active?: boolean;
}) {
  return mailcowRequest("/api/v1/add/alias", {
    active: input.active !== false ? "1" : "0",
    address: input.address,
    goto: input.goto,
  });
}

export async function editMailcowAlias(
  mailcowId: string,
  attr: Record<string, unknown>,
) {
  return mailcowRequest("/api/v1/edit/alias", {
    items: [mailcowId],
    attr,
  });
}

export async function deleteMailcowAlias(mailcowId: string) {
  // Delete endpoint expects a flat array of IDs
  return mailcowRequest("/api/v1/delete/alias", [mailcowId]);
}
