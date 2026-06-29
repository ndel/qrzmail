"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type State =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "error"; message: string };

export default function HomeSignupForm() {
  const router = useRouter();
  const [state, setState] = useState<State>({ type: "idle" });
  const [localPart, setLocalPart] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ type: "loading" });

    const formData = new FormData(event.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(formData);

    try {
      // Step 1: Create the mailbox via signup API
      const signupRes = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const signupResult = await signupRes.json();

      if (!signupRes.ok) {
        setState({ type: "error", message: signupResult.error ?? "Signup failed." });
        return;
      }

      // Step 2: Auto-login with the same credentials
      const email = signupResult.email;
      const password = body.password as string;

      const loginRes = await fetch("/api/account/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (loginRes.ok) {
        // Notify the navbar to re-fetch auth state
        window.dispatchEvent(new CustomEvent("qrzmail-auth-change"));
      }

      // Step 3: Redirect to webmail regardless of auto-login result
      router.push("/mail");
    } catch {
      setState({ type: "error", message: "Something went wrong. Please try again." });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {state.type === "error" && (
        <div className="message error" role="alert">
          {state.message}
        </div>
      )}

      <div className="field">
        <label htmlFor="home-signup-local">Email address</label>
        <div className="input-group">
          <input
            id="home-signup-local"
            name="localPart"
            autoComplete="off"
            value={localPart}
            onChange={(event) => setLocalPart(event.target.value)}
            minLength={3}
            maxLength={32}
            pattern="[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]"
            placeholder="you"
            required
          />
          <span className="suffix">@qrzmail.com</span>
        </div>
      </div>

      {/* Hidden email field for password managers */}
      <input
        aria-hidden="true"
        autoComplete="username"
        name="email"
        readOnly
        tabIndex={-1}
        type="email"
        value={localPart ? `${localPart.trim().toLowerCase()}@qrzmail.com` : ""}
        style={{
          position: "absolute",
          left: "-10000px",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      <div className="field">
        <label htmlFor="home-signup-name">Display name</label>
        <input
          id="home-signup-name"
          name="name"
          autoComplete="name"
          maxLength={80}
          placeholder="Your name"
        />
      </div>

      <div className="field">
        <label htmlFor="home-signup-password">Password</label>
        <input
          id="home-signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          placeholder="At least 10 characters"
          required
        />
      </div>

      <button className="button primary full" type="submit" disabled={state.type === "loading"}>
        {state.type === "loading" ? "Creating your mailbox…" : "Create free mailbox →"}
      </button>

      <p style={{ marginTop: "16px", fontSize: "13px", color: "var(--ink-soft)", textAlign: "center" }}>
        Already have an account?{" "}
        <Link href="/mail" className="text-link">
          Sign in
        </Link>
      </p>
    </form>
  );
}
