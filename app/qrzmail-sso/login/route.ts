import { NextResponse } from "next/server";
import { log, logRequest, logResponse } from "@/lib/middleware";

export const runtime = "nodejs";

const WEBMAIL_BASE_URL = process.env.WEBMAIL_BASE_URL ?? "https://mail.qrzmail.com/SOGo/so/";

/**
 * Mailcow PHP SSO script URL (internal, via nginx-mailcow).
 * This script authenticates via check_login() (Mailcow API -> Dovecot),
 * sets a PHP session with sogo-sso-user-allowed and sogo-sso-pass,
 * then redirects to /SOGo/so/. We capture the session cookie from its
 * response and forward it to the browser.
 */
const MAILCOW_SSO_URL =
  process.env.MAILCOW_SSO_URL ?? "https://nginx-mailcow/qrzmail-sogo-login.php";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getSetCookieHeaders(headers: Headers) {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = withGetSetCookie.getSetCookie?.();

  if (setCookies?.length) {
    return setCookies;
  }

  const singleHeader = headers.get("set-cookie");
  return singleHeader ? [singleHeader] : [];
}

export async function POST(request: Request) {
  const startTime = Date.now();
  logRequest(request, startTime);

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  log("info", "SSO login attempt", { email, passwordLength: password.length });

  if (!isValidEmail(email) || !password) {
    log("warn", "SSO invalid input");
    const response = NextResponse.redirect(new URL("/login", "https://qrzmail.com"));
    logResponse(request, response, startTime);
    return response;
  }

  // Call the Mailcow PHP SSO script which handles authentication
  // via check_login() (Mailcow API -> Dovecot) and sets the PHP session
  // with sogo-sso-user-allowed and sogo-sso-pass variables.
  let ssoResponse;
  try {
    ssoResponse = await fetch(MAILCOW_SSO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        email,
        password,
      }),
      // Don't follow redirects — we need to capture the Set-Cookie header
      redirect: "manual",
    });
  } catch (fetchError) {
    log("error", "Mailcow SSO script error", { error: fetchError instanceof Error ? fetchError.message : String(fetchError) });
    const response = NextResponse.redirect(new URL("/login", "https://qrzmail.com"));
    logResponse(request, response, startTime);
    return response;
  }

  log("info", "Mailcow SSO response", { status: ssoResponse.status });

  // If the PHP script returned a redirect (302), authentication succeeded
  // and a session cookie was set. Forward the cookie to the browser.
  if (ssoResponse.status !== 302 && ssoResponse.status !== 200) {
    log("warn", "Mailcow SSO script returned unexpected status", { status: ssoResponse.status });
    const body = await ssoResponse.text().catch(() => "could not read body");
    log("warn", "SSO response body", { body: body.substring(0, 200) });
    const response = NextResponse.redirect(new URL("/login", "https://qrzmail.com"));
    logResponse(request, response, startTime);
    return response;
  }

  // Redirect the user to SOGo webmail
  const response = NextResponse.redirect(
    `${WEBMAIL_BASE_URL}${encodeURIComponent(email)}/view`,
    { status: 303 }
  );
  response.headers.set("Cache-Control", "no-store");

  // Forward the PHP session cookie from the Mailcow SSO script
  const cookies = getSetCookieHeaders(ssoResponse.headers);
  log("info", "SSO cookies to forward", { count: cookies.length });

  for (const cookie of cookies) {
    response.headers.append("Set-Cookie", cookie);
  }

  log("info", "SSO redirecting to webmail", { email });

  logResponse(request, response, startTime);
  return response;
}
