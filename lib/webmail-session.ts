import { cookies } from "next/headers";
import crypto from "node:crypto";
import { requireEnv } from "./env";
import {
  WEBMAIL_SESSION_COOKIE_NAME,
  WEBMAIL_SESSION_MAX_AGE_SECONDS,
  clearWebmailSessionCookie,
  webmailSessionCookieOptions,
} from "./session";

export const WEBMAIL_COOKIE_NAME = WEBMAIL_SESSION_COOKIE_NAME;

const SESSION_SECRET = requireEnv("SESSION_SECRET");
const KEY = crypto.createHash("sha256").update(SESSION_SECRET).digest();

export type WebmailSession = {
  email: string;
  password: string;
  exp: number;
};

export function encryptWebmailSession(payload: WebmailSession) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

function decrypt(value?: string): WebmailSession | null {
  if (!value) return null;

  try {
    const raw = Buffer.from(value, "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    const payload = JSON.parse(json) as WebmailSession;

    if (!payload.email || !payload.password || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getWebmailSession() {
  const cookieStore = await cookies();
  return decrypt(cookieStore.get(WEBMAIL_SESSION_COOKIE_NAME)?.value);
}

export async function setWebmailSession(email: string, password: string) {
  const cookieStore = await cookies();
  const payload: WebmailSession = {
    email,
    password,
    exp: Date.now() + WEBMAIL_SESSION_MAX_AGE_SECONDS * 1000,
  };

  cookieStore.set(WEBMAIL_SESSION_COOKIE_NAME, encryptWebmailSession(payload), webmailSessionCookieOptions());
}

export async function clearWebmailSession() {
  await clearWebmailSessionCookie();
}
