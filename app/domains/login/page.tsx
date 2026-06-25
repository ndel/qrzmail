"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type State =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "error"; message: string };

export default function DomainLoginPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://qrzmail.com" },
      { "@type": "ListItem", position: 2, name: "Domain Login", item: "https://qrzmail.com/domains/login" },
    ],
  };

  const [state, setState] = useState<State>({ type: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ type: "loading" });

    const response = await fetch("/api/account/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
    });
    const result = await response.json();

    if (!response.ok) {
      setState({ type: "error", message: result.error ?? "Login failed." });
      return;
    }

    // Store CSRF token for subsequent API requests
    if (result.csrfToken) {
      sessionStorage.setItem("csrfToken", result.csrfToken);
    }

    window.location.href = "/domains";
  }

  return (
    <div className="form-wrap">
      <title>Domain Login – Manage Your Email Domains | QRZMail</title>
      <meta name="description" content="Sign in to your QRZMail domain account to manage custom email domains, verify DNS records, create mailboxes, and configure email authentication." />
      <meta name="robots" content="noindex, follow" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <form className="panel form-card" onSubmit={onSubmit}>
        <div className="form-heading">
          <span className="mark lg" aria-hidden="true" style={{ flexShrink: 0 }}>Q</span>
          <div>
            <h2>Domain management</h2>
            <p>Sign in to manage your domains, mailboxes, and email settings.</p>
          </div>
        </div>

        {state.type === "error" && <div className="message error">{state.message}</div>}

        <div className="field">
          <label htmlFor="email">Account email</label>
          <input id="email" name="email" type="email" autoComplete="username" placeholder="you@qrzmail.com" required />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
          />
        </div>

        <button className="button primary full" disabled={state.type === "loading"}>
          {state.type === "loading" ? "Checking..." : "Manage my domains"}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
          <Link className="text-link" href="/forgot-password" style={{ fontSize: "13px" }}>
            Forgot password?
          </Link>
          <Link className="text-link" href="/signup" style={{ fontSize: "13px" }}>
            Get a free @qrzmail.com address
          </Link>
        </div>
      </form>
    </div>
  );
}
