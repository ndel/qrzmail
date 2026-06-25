"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setErrorMsg("Invalid or missing password reset link.");
    }
  }, [token, email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (password.length < 10) {
      setStatus("error");
      setErrorMsg("Password must be at least 10 characters.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, password }),
    });

    if (!response.ok) {
      const result = await response.json();
      setStatus("error");
      setErrorMsg(result.error || "Failed to reset password. The link may have expired.");
      return;
    }

    setStatus("success");
  }

  if (status === "success") {
    return (
      <div className="form-wrap">
        <title>Password Reset Complete | QRZMail</title>
        <meta name="description" content="Your QRZMail password has been successfully reset. Log in with your new password." />
        <meta name="robots" content="noindex, nofollow" />
        <div className="panel form-card">
          <h1>Password Reset Complete</h1>
          <div className="message success">
            Your password has been successfully updated.
          </div>
          <Link href="/" className="button primary full" style={{ marginTop: "24px" }}>
            Log in with new password →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="form-wrap">
      <title>Reset Password – Set New Password | QRZMail</title>
      <meta name="description" content="Set a new password for your QRZMail account. Choose a strong password to secure your webmail and domain management." />
      <meta name="robots" content="noindex, nofollow" />
      <div className="panel form-card">
        <h1>Set New Password</h1>
        <p>Choose a strong password for <strong>{email}</strong>.</p>

        {errorMsg && <div className="message error">{errorMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={10}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={10}
              required
            />
          </div>

          <button 
            className="button primary full" 
            disabled={status === "loading" || !token || !email}
            style={{ marginTop: "12px" }}
          >
            {status === "loading" ? "Updating..." : "Update Password →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
