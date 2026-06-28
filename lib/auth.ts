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

type SessionPayload = {
  userId: string;
  email: string;
  role: string;
  exp: number;
};

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
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

export function createSessionToken(user: User) {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
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
