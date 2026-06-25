"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type SignupState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "success"; email: string; codes: string[] };

export default function SignupPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://qrzmail.com" },
      { "@type": "ListItem", position: 2, name: "Sign Up", item: "https://qrzmail.com/signup" },
    ],
  };

  const [state, setState] = useState<SignupState>({ type: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ type: "loading" });

    const formData = new FormData(event.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(formData);

    const response = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();

    if (!response.ok) {
      setState({ type: "error", message: result.error ?? "Signup failed." });
      return;
    }

    setState({ type: "success", email: result.email, codes: result.codes || [] });
    event.currentTarget.reset();
  }

  if (state.type === "success") {
    return (
      <div className="form-wrap">
        <title>Sign Up – Create Your QRZMail Mailbox | QRZMail</title>
        <meta name="description" content="Create a free qrzmail.com mailbox. Choose your email address and password to get started with secure webmail." />
        <meta name="robots" content="index, follow" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <div className="panel form-card">
          <h1>Welcome to QRZMail!</h1>
          <div className="message success">
            Your mailbox <strong>{state.email}</strong> was successfully created.
          </div>
          
          <h2 style={{ marginTop: "24px", fontSize: "18px", fontWeight: "bold" }}>Your Backup Codes</h2>
          <p style={{ marginTop: "8px", fontSize: "14px", color: "var(--ink-soft)" }}>
            Please save these backup codes in a secure place (like a password manager). 
            If you forget your password, you can use these to regain access. Each code can only be used once.
          </p>
          
          <div style={{
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: "8px", 
            marginTop: "16px",
            background: "rgba(255,255,255,0.05)",
            padding: "16px",
            borderRadius: "8px",
            fontFamily: "monospace",
            fontSize: "14px"
          }}>
            {state.codes.map((code) => (
              <div key={code}>{code}</div>
            ))}
          </div>

          <Link href="/" className="button primary full" style={{ marginTop: "24px" }}>
            Go to Login →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="form-wrap">
      <title>Sign Up – Create Your Free QRZMail Mailbox | QRZMail</title>
      <meta name="description" content="Create a free qrzmail.com mailbox. Choose your email address and password to get started with secure webmail, calendar, and contacts." />
      <meta name="robots" content="index, follow" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <form className="panel form-card" onSubmit={onSubmit}>
        <h1>Create your mailbox</h1>
        <p>Choose a qrzmail.com address and password.</p>

        {state.type === "error" && (
          <div className="message error">{state.message}</div>
        )}

        <div className="field">
          <label htmlFor="localPart">Email address</label>
          <div className="input-group">
            <input
              id="localPart"
              name="localPart"
              autoComplete="username"
              minLength={3}
              maxLength={32}
              pattern="[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]"
              required
            />
            <span className="suffix">@qrzmail.com</span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="name">Display name</label>
          <input id="name" name="name" autoComplete="name" maxLength={80} />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </div>

        <div className="field" style={{ marginTop: "8px" }}>
          <label htmlFor="recoveryEmail">Recovery Email (Optional)</label>
          <input
            id="recoveryEmail"
            name="recoveryEmail"
            type="email"
            placeholder="e.g. yourname@gmail.com"
          />
          <span className="fine-print" style={{ marginTop: "4px" }}>
            Used to reset your password if you forget it. If left blank, you will only have your backup codes for recovery.
          </span>
        </div>

        <button className="button primary full" disabled={state.type === "loading"} style={{ marginTop: "12px" }}>
          {state.type === "loading" ? "Creating..." : "Create mailbox"}
        </button>
      </form>
    </div>
  );
}
