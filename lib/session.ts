import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const ACCOUNT_SESSION_COOKIE_NAME = "qrzmail_session";
export const WEBMAIL_SESSION_COOKIE_NAME = "qrzmail_webmail";
export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

export const ACCOUNT_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const WEBMAIL_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

function secureCookie() {
  return process.env.NODE_ENV === "production";
}

export function accountSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookie(),
    path: "/",
    maxAge: ACCOUNT_SESSION_MAX_AGE_SECONDS,
  };
}

export function webmailSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookie(),
    path: "/",
    maxAge: WEBMAIL_SESSION_MAX_AGE_SECONDS,
  };
}

export function csrfCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookie(),
    path: "/",
    maxAge: ACCOUNT_SESSION_MAX_AGE_SECONDS,
  };
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function setAccountSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(ACCOUNT_SESSION_COOKIE_NAME, token, accountSessionCookieOptions());
}

export function setWebmailSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(WEBMAIL_SESSION_COOKIE_NAME, token, webmailSessionCookieOptions());
}

export function setCsrfCookie(response: NextResponse): string {
  const token = generateCsrfToken();
  setCsrfCookieValue(response, token);
  return token;
}

export function setCsrfCookieValue(response: NextResponse, token: string) {
  response.cookies.set(CSRF_COOKIE_NAME, token, csrfCookieOptions());
}

export function setAccountAuthCookies(
  response: NextResponse,
  sessionToken: string,
  csrfToken = generateCsrfToken(),
) {
  setAccountSessionCookie(response, sessionToken);
  setCsrfCookieValue(response, csrfToken);
  return csrfToken;
}

export function validateCsrf(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return true;
  }

  const cookieToken = extractCookie(cookieHeader, CSRF_COOKIE_NAME);
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
}

export async function clearAccountSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCOUNT_SESSION_COOKIE_NAME);
  cookieStore.delete(CSRF_COOKIE_NAME);
}

export async function clearWebmailSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(WEBMAIL_SESSION_COOKIE_NAME);
}

function extractCookie(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(name + "=")) {
      return trimmed.slice(name.length + 1);
    }
  }
  return null;
}
