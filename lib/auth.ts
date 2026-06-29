import { cookies } from "next/headers";
import crypto from "node:crypto";
import { requireEnv } from "./env";
import {
  ACCOUNT_SESSION_COOKIE_NAME,
  accountSessionCookieOptions,
  clearAccountSessionCookies,
} from "./session";
import { readData, type User } from "./store";

const SESSION_SECRET = requireEnv("SESSION_SECRET");
const PASSWORD_ITERATIONS = 120000;

// AES-256-GCM key derived from SESSION_SECRET for encrypting mailbox passwords
// in the session token. Using a separate derivation so the same secret can be
// used for both HMAC signing and encryption without key-reuse issues.
const ENC_KEY = crypto.createHash("sha256").update("mailbox-enc:" + SESSION_SECRET).digest();

type SessionPayload = {
  userId: string;
  email: string;
  role: string;
  exp: number;
  /** Encrypted mailbox password (AES-256-GCM), base64url-encoded. Absent for users without a mailbox. */
  mp?: string;
};

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

/**
 * Encrypt a mailbox password so it can be stored in the session token.
 * Returns a base64url-encoded string: iv (12) + tag (16) + ciphertext.
 */
export function encryptMailboxPassword(password: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const ciphertext = Buffer.concat([
    cipher.update(password, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

/**
 * Decrypt a mailbox password that was encrypted with encryptMailboxPassword.
 */
export function decryptMailboxPassword(encoded: string): string | null {
  try {
    const raw = Buffer.from(encoded, "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, 32, "sha256")
    .toString("base64url");

  return `pbkdf2:${PASSWORD_ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [method, iterations, salt, hash] = storedHash.split(":");
  if (method !== "pbkdf2" || !iterations || !salt || !hash) {
    return false;
  }

  const computed = crypto
    .pbkdf2Sync(password, salt, Number(iterations), 32, "sha256")
    .toString("base64url");

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computed));
}

export function createSessionToken(user: User, mailboxPassword?: string) {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  if (mailboxPassword) {
    payload.mp = encryptMailboxPassword(mailboxPassword);
  }
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token?: string): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || sign(encoded) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: User) {
  const cookieStore = await cookies();
  cookieStore.set(
    ACCOUNT_SESSION_COOKIE_NAME,
    createSessionToken(user),
    accountSessionCookieOptions(),
  );
}

export async function clearSessionCookie() {
  await clearAccountSessionCookies();
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return null;
  }

  const data = await readData();
  return data.users.find((user) => user.id === session.userId) ?? null;
}

/**
 * Read the current session payload (including encrypted mailbox password if present).
 * Returns null if no valid session exists.
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE_NAME)?.value);
}
