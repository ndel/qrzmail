"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type State =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

export default function SubscribePage() {
  const [state, setState] = useState<State>({ type: "idle" });
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "business">("starter");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userSubscription, setUserSubscription] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((data) => {
        if (data.user) {
          setUserEmail(data.user.email);
          setUserSubscription(data.user.subscription);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubscribe(e: FormEvent) {
    e.preventDefault();
    setState({ type: "loading" });

    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: selectedPlan }),
    });

    const result = await response.json();

    if (!response.ok) {
      setState({ type: "error", message: result.error ?? "Subscription request failed." });
      return;
    }

    setState({ type: "success", message: result.message });
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://qrzmail.com" },
      { "@type": "ListItem", position: 2, name: "Subscribe", item: "https://qrzmail.com/subscribe" },
    ],
  };

  return (
    <div className="form-wrap">
      <title>Subscribe – Upgrade Your QRZMail Plan | QRZMail</title>
      <meta name="description" content="Upgrade your QRZMail domain email hosting plan. Get more mailboxes, more storage, and priority support for your business." />
      <meta name="robots" content="noindex, follow" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {state.type === "success" ? (
        <div className="panel form-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
          <h1>Request Submitted!</h1>
          <div className="message success" style={{ marginTop: "16px", textAlign: "left" }}>
            {state.message}
          </div>
          <p style={{ marginTop: "20px", fontSize: "14px", color: "var(--ink-soft)", lineHeight: "1.6" }}>
            We'll review your request and send an invoice with payment instructions
            to <strong>{userEmail}</strong> within 1-2 business days.
            Once payment is confirmed, your plan will be activated.
          </p>
          <Link href="/domains" className="button primary full" style={{ marginTop: "24px" }}>
            Back to Dashboard →
          </Link>
        </div>
      ) : (
        <form className="panel form-card" onSubmit={handleSubscribe}>
          <h1>Upgrade Your Plan</h1>
          <p>Get more mailboxes, more storage, and priority support.</p>

          {state.type === "error" && (
            <div className="message error">{state.message}</div>
          )}

          {!userEmail && (
            <div className="message" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", color: "#fcd34d" }}>
              Please <Link href="/domains/login" className="text-link">sign in to your domain account</Link> to subscribe.
            </div>
          )}

          {userSubscription === "paid" && (
            <div className="message success">You are already on a paid plan. Thank you for your support!</div>
          )}

          {userSubscription === "pending" && (
            <div className="message" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", color: "#fcd34d" }}>
              Your subscription request is pending. We'll be in touch soon.
            </div>
          )}

          {/* Plan Selection */}
          <div style={{ display: "grid", gap: "16px", marginTop: "24px" }}>
            {/* Starter Plan */}
            <label
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "16px",
                padding: "20px",
                border: `2px solid ${selectedPlan === "starter" ? "var(--accent)" : "var(--panel-border)"}`,
                borderRadius: "14px",
                background: selectedPlan === "starter" ? "rgba(59,130,246,0.08)" : "var(--panel)",
                cursor: "pointer",
                transition: "border-color 0.15s",
                alignItems: "start",
              }}
            >
              <input
                type="radio"
                name="plan"
                value="starter"
                checked={selectedPlan === "starter"}
                onChange={() => setSelectedPlan("starter")}
                style={{ marginTop: "4px", accentColor: "var(--accent)" }}
              />
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "18px" }}>Starter</strong>
                  <span style={{ fontSize: "22px", fontWeight: "800", color: "var(--accent-light)" }}>
                    $9<span style={{ fontSize: "14px", fontWeight: "500", color: "var(--ink-soft)" }}>/mo</span>
                  </span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "8px", fontSize: "14px", color: "var(--ink-soft)" }}>
                  <li style={{ display: "flex", gap: "8px", alignItems: "center" }}>✓ Up to 25 mailboxes</li>
                  <li style={{ display: "flex", gap: "8px", alignItems: "center" }}>✓ 10 GB storage per mailbox</li>
                  <li style={{ display: "flex", gap: "8px", alignItems: "center" }}>✓ Unlimited aliases</li>
                  <li style={{ display: "flex", gap: "8px", alignItems: "center" }}>✓ Priority email support</li>
                </ul>
              </div>
            </label>

            {/* Business Plan */}
            <label
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "16px",
                padding: "20px",
                border: `2px solid ${selectedPlan === "business" ? "var(--green)" : "var(--panel-border)"}`,
                borderRadius: "14px",
                background: selectedPlan === "business" ? "rgba(34,197,94,0.08)" : "var(--panel)",
                cursor: "pointer",
                transition: "border-color 0.15s",
                alignItems: "start",
              }}
            >
              <input
                type="radio"
                name="plan"
                value="business"
                checked={selectedPlan === "business"}
                onChange={() => setSelectedPlan("business")}
                style={{ marginTop: "4px", accentColor: "var(--green)" }}
              />
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "18px" }}>Business</strong>
                  <span style={{ fontSize: "22px", fontWeight: "800", color: "var(--green)" }}>
                    $29<span style={{ fontSize: "14px", fontWeight: "500", color: "var(--ink-soft)" }}>/mo</span>
                  </span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "8px", fontSize: "14px", color: "var(--ink-soft)" }}>
                  <li style={{ display: "flex", gap: "8px", alignItems: "center" }}>✓ Unlimited mailboxes</li>
                  <li style={{ display: "flex", gap: "8px", alignItems: "center" }}>✓ 25 GB storage per mailbox</li>
                  <li style={{ display: "flex", gap: "8px", alignItems: "center" }}>✓ Unlimited aliases</li>
                  <li style={{ display: "flex", gap: "8px", alignItems: "center" }}>✓ Priority email & phone support</li>
                  <li style={{ display: "flex", gap: "8px", alignItems: "center" }}>✓ Custom DKIM/DMARC consultation</li>
                </ul>
              </div>
            </label>
          </div>

          <div className="fine-print" style={{ marginTop: "16px", lineHeight: "1.5" }}>
            <strong>How it works:</strong> After submitting, we'll send an invoice to your email.
            Payment is processed manually via bank transfer or payment link.
            Once confirmed, your plan is activated within 24 hours.
          </div>

          <button
            className="button primary full"
            disabled={state.type === "loading" || !userEmail || userSubscription === "paid" || userSubscription === "pending"}
            style={{ marginTop: "20px" }}
          >
            {state.type === "loading"
              ? "Submitting..."
              : userSubscription === "paid"
                ? "Already on Paid Plan"
                : userSubscription === "pending"
                  ? "Request Pending"
                  : "Request Subscription →"}
          </button>

          <Link href="/domains" className="button full" style={{ marginTop: "12px" }}>
            Back to Dashboard
          </Link>
        </form>
      )}
    </div>
  );
}
