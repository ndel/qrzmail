"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function WebmailLoginForm({
  loginFailed,
}: {
  loginFailed: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/account/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (body as { error?: string }).error ??
            "Email address or password is incorrect.",
        );
      }

      // Notify the navbar (NavUser) to re-fetch auth state
      window.dispatchEvent(new CustomEvent("qrzmail-auth-change"));
      // Login succeeded — redirect to the built-in webmail client
      router.push("/mail");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Email address or password is incorrect.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {(loginFailed || error) && (
        <div className="message error" role="alert">
          {error || "Email address or password is incorrect."}
        </div>
      )}

      <div className="field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@yourdomain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <label htmlFor="password">Password</label>
          <Link
            href="/forgot-password"
            style={{ fontSize: "12px", color: "var(--accent-light)" }}
          >
            Forgot?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button className="button primary full" type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Open my inbox →"}
      </button>
    </form>
  );
}
