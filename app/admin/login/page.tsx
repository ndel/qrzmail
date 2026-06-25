"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError((body as { error?: string }).error ?? "Login failed.");
        return;
      }

      router.push("/admin");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-wrap">
      <form className="panel form-card" onSubmit={handleSubmit}>
        <h1>Admin dashboard</h1>
        <p>For QRZMail platform administrators.</p>

        {error && <div className="message error">{error}</div>}

        <div className="field">
          <label htmlFor="email">Admin email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="button primary full" type="submit" disabled={busy}>
          {busy ? "Logging in…" : "Log in as admin"}
        </button>

        <p className="fine-print" style={{ marginTop: 16 }}>
          Only accounts with the superadmin role can access this panel.
        </p>
      </form>
    </div>
  );
}
