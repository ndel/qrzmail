"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://qrzmail.com" },
      { "@type": "ListItem", position: 2, name: "Forgot Password", item: "https://qrzmail.com/forgot-password" },
    ],
  };

  const [step, setStep] = useState<"email" | "method" | "code" | "success" | "loading" | "error">("email");
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [hasBackupCodes, setHasBackupCodes] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep("loading");
    setErrorMsg("");

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lookup", email }),
    });

    const result = await response.json();

    if (!response.ok) {
      setErrorMsg(result.error || "Failed to lookup account");
      setStep("email");
      return;
    }

    setHasBackupCodes(result.hasBackupCodes ?? false);

    if (result.hasRecoveryEmail) {
      setStep("method"); // Let them choose email or code
    } else if (result.hasBackupCodes) {
      setStep("code"); // Force code if no recovery email but has codes
    } else {
      setErrorMsg("No recovery email or backup codes found for this account. Please contact support.");
      setStep("email");
    }
  }

  async function handleSendEmail() {
    setStep("loading");
    setErrorMsg("");
    
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_email", email }),
    });

    if (!response.ok) {
      const result = await response.json();
      setErrorMsg(result.error || "Failed to send email");
      setStep("method");
      return;
    }
    
    setStep("success");
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep("loading");
    setErrorMsg("");

    // Send code to backend to verify and get a reset token
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify_code", email, code }),
    });

    const result = await response.json();

    if (!response.ok) {
      setErrorMsg(result.error || "Invalid backup code");
      setStep("code");
      return;
    }

    // Redirect to reset page with token
    window.location.href = `/reset-password?token=${result.token}&email=${encodeURIComponent(email)}`;
  }

  return (
    <div className="form-wrap">
      <title>Forgot Password – Recover Your QRZMail Account | QRZMail</title>
      <meta name="description" content="Reset your QRZMail password using your recovery email or backup codes. Regain access to your webmail inbox and domain management." />
      <meta name="robots" content="noindex, follow" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="panel form-card">
        <h1>Forgot Password</h1>
        <p>Recover access to your QRZMail account.</p>

        {errorMsg && <div className="message error">{errorMsg}</div>}

        {step === "email" && (
          <form onSubmit={handleEmailSubmit}>
            <div className="field">
              <label htmlFor="email">Your QRZMail Address</label>
              <input
                id="email"
                type="email"
                placeholder="you@qrzmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button className="button primary full">Continue →</button>
          </form>
        )}

        {step === "method" && (
          <div className="stack" style={{ gap: "16px" }}>
            <p style={{ fontSize: "14px" }}>How would you like to reset your password?</p>
            <button onClick={handleSendEmail} className="button primary full">
              Send reset link to Recovery Email
            </button>
            <div style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: "14px" }}>or</div>
            <button onClick={() => setStep("code")} className="button full">
              Use a Backup Code
            </button>
          </div>
        )}

        {step === "code" && (
          <form onSubmit={handleCodeSubmit}>
            <p style={{ fontSize: "14px", marginBottom: "16px", color: "var(--ink-soft)" }}>
              Enter one of your 8-character backup codes.
            </p>
            <div className="field">
              <label htmlFor="code">Backup Code</label>
              <input
                id="code"
                type="text"
                placeholder="XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />
            </div>
            <button className="button primary full">Verify Code →</button>
            <button type="button" className="button full" style={{ marginTop: "12px" }} onClick={() => setStep("email")}>
              Go back
            </button>
          </form>
        )}

        {step === "success" && (
          <div className="message success" style={{ textAlign: "center" }}>
            If a recovery email was found for this account, a reset link has been sent. Please check your inbox.
          </div>
        )}

        {step === "loading" && (
          <div style={{ textAlign: "center", padding: "24px", color: "var(--ink-soft)" }}>
            Please wait...
          </div>
        )}

        <p style={{ marginTop: "24px", fontSize: "13px", textAlign: "center" }}>
          Remembered your password? <Link href="/mail" className="text-link">Log in</Link>
        </p>
      </div>
    </div>
  );
}
