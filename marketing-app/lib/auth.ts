import { cookies } from "next/headers";
import crypto from "node:crypto";
import db from "./db";

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.MARKETING_SESSION_SECRET || "marketing-dev-secret-change-in-production";
const PASSWORD_ITERATIONS = 120000;

const MARKETING_SESSION_COOKIE = "qrzmail_marketing_session";

type SessionPayload = {
  userId: string;
  email: string;
  name: string;
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

export function createSessionToken(user: { id: string; email: string; name: string }) {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token?: string): SessionPayload | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || sign(encoded) !== signature) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(MARKETING_SESSION_COOKIE)?.value);
  if (!session) return null;

  const user = db.prepare("SELECT id, email, name FROM marketing_users WHERE id = ?").get(session.userId) as any;
  if (!user) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/marketing",
    maxAge: 7 * 24 * 60 * 60,
  };
}

export { MARKETING_SESSION_COOKIE };
